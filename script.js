(function () {
  "use strict";

  // sinaliza para o CSS que JS está disponível
  document.documentElement.classList.add("js");

  // ── LIGHTBOX ────────────────────────────────────────────────────────────
  // Dados embutidos pelo build.js em window.__FANARTS__

  const FANARTS = window.__FANARTS__ || [];
  if (!FANARTS.length) return;

  let current = 0;

  const lb      = document.getElementById("lightbox-dynamic");
  const lbImg   = document.getElementById("lb-img");
  const lbCap   = document.getElementById("lb-caption");
  const lbClose = document.getElementById("lb-close");
  const lbPrev  = document.getElementById("lb-prev");
  const lbNext  = document.getElementById("lb-next");

  if (!lb) return;

  function show(index) {
    current = (index + FANARTS.length) % FANARTS.length;
    const art = FANARTS[current];
    lbImg.src = "fanarts/" + art.file;
    lbImg.alt = "Fanart por " + (art.author || "anônimo");

    if (art.author) {
      if (art.authorUrl) {
        const a = document.createElement("a");
        a.href = art.authorUrl;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = art.author;
        a.style.color = "white";
        lbCap.textContent = "por ";
        lbCap.appendChild(a);
      } else {
        lbCap.textContent = "por " + art.author;
      }
    } else {
      lbCap.textContent = "";
    }

    lb.classList.add("open");
    lb.removeAttribute("aria-hidden");
    document.body.style.overflow = "hidden";
    lbClose.focus();
  }

  function close() {
    lb.classList.remove("open");
    lb.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  // intercepta cliques na grid (evita mudar o hash para #fanart-N)
  document.querySelectorAll(".fanart-item[data-index]").forEach(el => {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      show(parseInt(this.dataset.index, 10));
    });
  });

  lbClose.addEventListener("click", close);
  lbPrev.addEventListener("click",  () => show(current - 1));
  lbNext.addEventListener("click",  () => show(current + 1));

  // fechar clicando fora da imagem
  lb.addEventListener("click", function (e) {
    if (e.target === lb) close();
  });

  // teclado
  document.addEventListener("keydown", function (e) {
    if (!lb.classList.contains("open")) return;
    if (e.key === "Escape")     close();
    if (e.key === "ArrowRight") show(current + 1);
    if (e.key === "ArrowLeft")  show(current - 1);
  });

  // swipe em touch
  let touchStartX = 0;
  lb.addEventListener("touchstart", e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend",   e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
  });

}());
