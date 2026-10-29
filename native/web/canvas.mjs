// <canvas/ui> on the web: CanvasView's element, a <canvas> filling its box, registered by the
// id the Eskiu side gives it so native/web/canvas.js draws on it.
export function setup(ui) {
  ui.registerView('canvas', {
    create() {
      const element = document.createElement('canvas');
      element.style.width = '100%';
      element.style.height = '100%';
      element.style.display = 'block';
      const state = globalThis.eskiuCanvas ??= {views: new Map(), images: new Map(), next: 1};
      let id = 0;
      return {
        element,
        set(name, value) {
          if (name !== 'id') return;
          if (id) state.views.delete(id);
          id = Number(value);
          if (id) state.views.set(id, element);
        },
        dispose() { if (id) state.views.delete(id); },
      };
    },
  });
}
