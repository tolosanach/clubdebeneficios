(() => {
  const g: any = globalThis as any;
  if (!g.crypto) g.crypto = {};

  if (typeof g.crypto.randomUUID !== "function") {
    g.crypto.randomUUID = () => {
      return (
        "id-" +
        Date.now().toString(36) +
        "-" +
        Math.random().toString(36).slice(2, 10) +
        "-" +
        Math.random().toString(36).slice(2, 10)
      );
    };
  }
})();
