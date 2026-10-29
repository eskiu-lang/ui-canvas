<p align="center">
  <img src="https://raw.githubusercontent.com/eskiu-lang/eskiu/main/assets/logo.png" alt="Eskiu, a kitten with a ball of yarn" width="140">
</p>

<h2 align="center">canvas</h2>
<p align="center">A 2D canvas for Eskiu, drawn by the GPU, in a ui app or offscreen.</p>
<p align="center"><sub>Part of the <a href="https://github.com/eskiu-lang">Eskiu</a> project</sub></p>

---

`canvas` draws images, atlas cells and filled rects with WebGPU through
[`gpu`](https://github.com/eskiu-lang/gpu). It is made for sprites and pixel art: each draw
takes a source rect, a destination rect, an opacity, a tint and nearest or linear sampling,
and draws are batched into one draw call per run of the same image.

```eskiu
import <ui>;
import <canvas>;
import <canvas/ui>;

void Game() {
    *Signal<bool> playing = use_signal<bool>(true);
    CanvasView(Style{grow: 1}, playing.get(), void(*Canvas canvas, Tick tick) {
        world_step(&world, tick.delta);
        canvas.fill_rect(CanvasRect{0, 0, canvas.width(), canvas.height()}, 0x14182aff);
        canvas.draw_image_rect(&atlas, CanvasRect{16, 0, 16, 16}, CanvasRect{x, y, 64, 64}, Paint{nearest: true});
    });
}
```

`examples/demo` bounces pixel-art sprites from an atlas made in code (`ui run ios`,
`android` or `web`).


## Install

In an app made with `ui new`:

```bash
eskiuc add canvas --git https://github.com/eskiu-lang/ui-canvas --rev v0.1.0
```
## `<canvas>`

| Call | Does |
|---|---|
| `canvas_new(&gpu, format)` | a canvas for views of `format` (a surface's, or `RGBA8Unorm` for `Gpu_target`) |
| `canvas.image_rgba(w, h, rgba)`, `image(&bitmap)`, `image_decode(data, len)`, `image_load(path)` | a `CanvasImage` from pixels, a `<gpu/image>` `Bitmap`, or encoded bytes or a file: PNG and JPEG everywhere, and on iOS and Android what the platform decodes (WebP, HEIC, GIF; Android 11 and later) |
| `image.write(rgba)` | replace an image's pixels (same size) |
| `canvas.begin(view, width, height, scale, clear)` | start a frame: `width` x `height` pixels, `scale` pixels per unit, cleared to `0xRRGGBBAA` |
| `canvas.draw_image_rect(&img, src, dst, paint)` | the `src` rect of the image (pixels) into `dst` (units); a negative width or height mirrors |
| `canvas.draw_image(&img, x, y, paint)` | the whole image at its size |
| `canvas.fill_rect(rect, color)` | a rect of one color (`0xRRGGBBAA`) |
| `canvas.save()`, `restore()`, `translate(x, y)`, `scale(sx, sy)`, `rotate(degrees)`, `concat(matrix)` | the transform stack |
| `canvas.width()`, `height()` | the canvas in units |
| `canvas.end()` | send the frame (returns the number of draw calls) |

`Paint{alpha, tint, nearest}` defaults to opaque, untinted and linear. Colors use straight
alpha.

An image in the app's `assets/` loads by its path from ui's `ui_asset_path`:

```eskiu
string path = ui_asset_path("sprites/atlas.webp");
CanvasImage atlas = canvas.image_load(path)?;
free(path);
```

## `<canvas/ui>`

`CanvasView(style, running, draw)` is a view whose canvas is drawn by `draw` once per display
frame (ui's `use_frame`) while `running`, and once each time the view gets a new size. The
canvas is in points, like the layout. On iOS and Android it is a `GpuView` drawn with WebGPU;
on the web (and the desktop, which runs the web build) a `<canvas>` element drawn with the
browser's Canvas 2D, through the same calls: one browser call per draw rather than batches,
a tint through a scratch canvas, and PNG and JPEG images (the browser decodes nothing
synchronously).

## Tests

`eskiuc test` draws into a 16x16 texture and checks the pixels: nearest and linear sampling,
atlas cells, alpha, tint, mirroring, transforms and batching. It runs with no GPU on Linux
through lavapipe.

## License

MIT
