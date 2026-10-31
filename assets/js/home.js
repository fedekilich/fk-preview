// Home — grilla de casos destacados.
// La primera card ocupa el ancho completo, como en el diseño.

import { initSite, getLang, onLangChange, loadCases, featured } from "./site.js";
import { caseCard } from "./ui.js";

const grid = document.getElementById("featured-cases");

let cases = [];

function render() {
  if (!grid) return;
  const lang = getLang();

  grid.replaceChildren(
    ...cases.map((kase, index) =>
      caseCard(kase, {
        lang,
        index,
        aspect: index === 0 ? "21 / 9" : "16 / 10",
        span: index === 0 ? "1 / -1" : null
      })
    )
  );
}

initSite();
onLangChange(render);

loadCases().then((all) => {
  cases = featured(all);
  render();
});
