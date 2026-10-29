// <canvas> on iOS: images in the formats <gpu/image> does not read (WebP, HEIC, GIF...)
// decoded by ImageIO into straight-alpha RGBA, for Canvas_image_decode.
#import <ImageIO/ImageIO.h>
#import <CoreGraphics/CoreGraphics.h>
#include <stdint.h>
#include <stdlib.h>

uint8_t *canvas_native_decode(const uint8_t *data, int64_t len, int *width, int *height) {
    CFDataRef bytes = CFDataCreateWithBytesNoCopy(NULL, data, (CFIndex)len, kCFAllocatorNull);
    CGImageSourceRef source = CGImageSourceCreateWithData(bytes, NULL);
    CGImageRef image = source ? CGImageSourceCreateImageAtIndex(source, 0, NULL) : NULL;
    uint8_t *pixels = NULL;
    if (image) {
        size_t w = CGImageGetWidth(image), h = CGImageGetHeight(image);
        pixels = (uint8_t *)calloc(w * h, 4);
        CGColorSpaceRef space = CGColorSpaceCreateWithName(kCGColorSpaceSRGB);
        CGContextRef context = pixels ? CGBitmapContextCreate(pixels, w, h, 8, w * 4, space,
            kCGImageAlphaPremultipliedLast | kCGBitmapByteOrder32Big) : NULL;
        if (context) {
            CGContextSetBlendMode(context, kCGBlendModeCopy);
            CGContextDrawImage(context, CGRectMake(0, 0, w, h), image);
            CGContextRelease(context);
            // Core Graphics draws premultiplied; the canvas takes straight alpha.
            for (size_t i = 0; i < w * h; i++) {
                uint8_t *p = pixels + i * 4;
                if (p[3] && p[3] < 255) {
                    for (int c = 0; c < 3; c++) p[c] = (uint8_t)((p[c] * 255 + p[3] / 2) / p[3]);
                }
            }
            *width = (int)w;
            *height = (int)h;
        } else {
            free(pixels);
            pixels = NULL;
        }
        CGColorSpaceRelease(space);
        CGImageRelease(image);
    }
    if (source) CFRelease(source);
    CFRelease(bytes);
    return pixels;
}
