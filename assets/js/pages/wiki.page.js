window.WikiPage = function() {
  let root = null;

  async function mount(container) {
    root = container;
  }

  function unmount() { }

  return { mount, unmount };
};
