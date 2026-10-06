// true cuando la pestaña está en segundo plano (otra pestaña, app minimizada o pantalla apagada).
// Los refrescos periódicos se saltan en ese estado para no cargar al servidor sin necesidad.
export const pestanaOculta = () =>
  typeof document !== 'undefined' && document.visibilityState === 'hidden';
