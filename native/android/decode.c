// <canvas> on Android: images in the formats <gpu/image> does not read (WebP, HEIF, GIF...)
// decoded by the NDK's AImageDecoder into straight-alpha RGBA, for Canvas_image_decode.
// AImageDecoder is in Android 11 (API 30) and later; it is looked up at run time, so the app
// still runs on older versions, where these formats do not decode.
#include <dlfcn.h>
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include <stdlib.h>

typedef struct AImageDecoder AImageDecoder;
typedef struct AImageDecoderHeaderInfo AImageDecoderHeaderInfo;

static struct {
    int (*create)(const void *, size_t, AImageDecoder **);
    const AImageDecoderHeaderInfo *(*header)(const AImageDecoder *);
    int32_t (*width)(const AImageDecoderHeaderInfo *);
    int32_t (*height)(const AImageDecoderHeaderInfo *);
    int (*format)(AImageDecoder *, int32_t);
    int (*unpremultiplied)(AImageDecoder *, bool);
    size_t (*stride)(AImageDecoder *);
    int (*decode)(AImageDecoder *, void *, size_t, size_t);
    void (*destroy)(AImageDecoder *);
    int loaded;
} api;

static int load(void) {
    if (api.loaded) return api.loaded > 0;
    api.loaded = -1;
    void *lib = dlopen("libjnigraphics.so", RTLD_NOW);
    if (!lib) return 0;
    *(void **)&api.create = dlsym(lib, "AImageDecoder_createFromBuffer");
    *(void **)&api.header = dlsym(lib, "AImageDecoder_getHeaderInfo");
    *(void **)&api.width = dlsym(lib, "AImageDecoderHeaderInfo_getWidth");
    *(void **)&api.height = dlsym(lib, "AImageDecoderHeaderInfo_getHeight");
    *(void **)&api.format = dlsym(lib, "AImageDecoder_setAndroidBitmapFormat");
    *(void **)&api.unpremultiplied = dlsym(lib, "AImageDecoder_setUnpremultipliedRequired");
    *(void **)&api.stride = dlsym(lib, "AImageDecoder_getMinimumStride");
    *(void **)&api.decode = dlsym(lib, "AImageDecoder_decodeImage");
    *(void **)&api.destroy = dlsym(lib, "AImageDecoder_delete");
    if (!api.create || !api.header || !api.width || !api.height || !api.format || !api.unpremultiplied ||
        !api.stride || !api.decode || !api.destroy) return 0;
    api.loaded = 1;
    return 1;
}

uint8_t *canvas_native_decode(const uint8_t *data, int64_t len, int *width, int *height) {
    if (!load()) return NULL;
    AImageDecoder *decoder = NULL;
    if (api.create(data, (size_t)len, &decoder) != 0 || !decoder) return NULL;
    const AImageDecoderHeaderInfo *info = api.header(decoder);
    int32_t w = api.width(info), h = api.height(info);
    uint8_t *pixels = NULL;
    // ANDROID_BITMAP_FORMAT_RGBA_8888 is 1; success is 0.
    if (w > 0 && h > 0 && api.format(decoder, 1) == 0 && api.unpremultiplied(decoder, true) == 0) {
        size_t stride = (size_t)w * 4;
        if (api.stride(decoder) <= stride) {
            pixels = (uint8_t *)malloc(stride * (size_t)h);
            if (pixels && api.decode(decoder, pixels, stride, stride * (size_t)h) != 0) { free(pixels); pixels = NULL; }
        }
    }
    api.destroy(decoder);
    if (pixels) { *width = w; *height = h; }
    return pixels;
}
