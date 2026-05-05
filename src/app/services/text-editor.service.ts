export class TextEditorService {

  createTextElement(value: string, x: number, y: number, font: string): HTMLElement {
    const div = document.createElement('div');

    div.innerText = value;

    Object.assign(div.style, {
      position: 'absolute',
      left: `${x}px`,
      top: `${y}px`,
      fontSize: '16px',
      fontFamily: font,
      color: 'black',
      cursor: 'move',
      userSelect: 'none',
      padding: '2px'
    });

    return div;
  }

  makeDraggable(element: HTMLElement) {
    let isDragging = false;
    let startX = 0, startY = 0;
    let initialLeft = 0, initialTop = 0;

    element.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      initialLeft = element.offsetLeft;
      initialTop = element.offsetTop;
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;

      element.style.left = initialLeft + (e.clientX - startX) + 'px';
      element.style.top = initialTop + (e.clientY - startY) + 'px';
    });

    document.addEventListener('mouseup', () => isDragging = false);
  }
}