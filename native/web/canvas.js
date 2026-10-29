// <canvas> on the web: the externs of src/canvas.esk over the browser's Canvas 2D. Images are
// <canvas> elements of their pixels; views are the CanvasView elements canvas.mjs registers.
// Draws take the unit square through the Eskiu side's transform, so mirroring and rotation
// come from the matrix.
mergeInto(LibraryManager.library, {
  $eskiuCanvasState: function() {
    const state = globalThis.eskiuCanvas ??= {views: new Map(), images: new Map(), next: 1};
    state.scratch ??= document.createElement('canvas');
    return state;
  },
  $eskiuCanvasColor: function(rgba) {
    rgba >>>= 0;
    return `rgba(${rgba >>> 24}, ${(rgba >>> 16) & 255}, ${(rgba >>> 8) & 255}, ${(rgba & 255) / 255})`;
  },

  canvas_web_image__deps: ['$eskiuCanvasState'],
  canvas_web_image: function(width, height, rgba) {
    const state = eskiuCanvasState();
    const image = document.createElement('canvas');
    image.width = width;
    image.height = height;
    const pixels = new Uint8ClampedArray(HEAPU8.slice(rgba, rgba + width * height * 4));
    image.getContext('2d').putImageData(new ImageData(pixels, width, height), 0, 0);
    const id = state.next++;
    state.images.set(id, image);
    return id;
  },
  canvas_web_image_write__deps: ['$eskiuCanvasState'],
  canvas_web_image_write: function(id, rgba) {
    const image = eskiuCanvasState().images.get(id);
    if (!image) return;
    const pixels = new Uint8ClampedArray(HEAPU8.slice(rgba, rgba + image.width * image.height * 4));
    image.getContext('2d').putImageData(new ImageData(pixels, image.width, image.height), 0, 0);
  },
  canvas_web_image_release__deps: ['$eskiuCanvasState'],
  canvas_web_image_release: function(id) { eskiuCanvasState().images.delete(id); },

  canvas_web_begin__deps: ['$eskiuCanvasState', '$eskiuCanvasColor'],
  canvas_web_begin: function(view, width, height, clear) {
    const element = eskiuCanvasState().views.get(view);
    if (!element || width <= 0 || height <= 0) return 0;
    if (element.width !== width) element.width = width;
    if (element.height !== height) element.height = height;
    const context = element.getContext('2d');
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.globalAlpha = 1;
    context.clearRect(0, 0, width, height);
    if ((clear & 255) !== 0) { context.fillStyle = eskiuCanvasColor(clear); context.fillRect(0, 0, width, height); }
    return 1;
  },

  canvas_web_draw__deps: ['$eskiuCanvasState', '$eskiuCanvasColor'],
  canvas_web_draw: function(view, id, nearest, sx, sy, sw, sh, a, b, c, d, tx, ty, tint, alpha) {
    const state = eskiuCanvasState();
    const element = state.views.get(view);
    let source = state.images.get(id);
    if (!element || !source || sw === 0 || sh === 0) return;
    const context = element.getContext('2d');
    tint >>>= 0;
    if ((tint | 255) >>> 0 !== 0xffffffff) {
      // The cell multiplied by the tint's color, keeping the image's alpha.
      const w = Math.max(1, Math.ceil(Math.abs(sw))), h = Math.max(1, Math.ceil(Math.abs(sh)));
      const scratch = state.scratch;
      if (scratch.width < w) scratch.width = w;
      if (scratch.height < h) scratch.height = h;
      const s = scratch.getContext('2d');
      s.setTransform(1, 0, 0, 1, 0, 0);
      s.clearRect(0, 0, w, h);
      s.imageSmoothingEnabled = false;
      s.globalCompositeOperation = 'source-over';
      s.drawImage(source, sx, sy, sw, sh, 0, 0, w, h);
      s.globalCompositeOperation = 'multiply';
      s.fillStyle = eskiuCanvasColor((tint & 0xffffff00) | 255);
      s.fillRect(0, 0, w, h);
      s.globalCompositeOperation = 'destination-in';
      s.drawImage(source, sx, sy, sw, sh, 0, 0, w, h);
      s.globalCompositeOperation = 'source-over';
      source = scratch;
      sx = 0; sy = 0; sw = w; sh = h;
    }
    context.imageSmoothingEnabled = !nearest;
    context.globalAlpha = Math.max(0, Math.min(1, alpha * (tint & 255) / 255));
    context.setTransform(a, b, c, d, tx, ty);
    context.drawImage(source, sx, sy, sw, sh, 0, 0, 1, 1);
  },

  canvas_web_fill__deps: ['$eskiuCanvasState', '$eskiuCanvasColor'],
  canvas_web_fill: function(view, a, b, c, d, tx, ty, color) {
    const element = eskiuCanvasState().views.get(view);
    if (!element) return;
    const context = element.getContext('2d');
    context.globalAlpha = 1;
    context.setTransform(a, b, c, d, tx, ty);
    context.fillStyle = eskiuCanvasColor(color);
    context.fillRect(0, 0, 1, 1);
  },
});
