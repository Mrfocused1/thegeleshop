(function () {
  const SHAPES = {
    oval: {
      name: "Oval",
      blurb: "The most balanced canvas. Length and width sit in gentle proportion, so almost any silhouette flatters — choose the gele that matches your mood.",
      principle: "Wear what you love. Lean into drama or softness — both will read as elegant on this shape.",
      matches: ["asymmetric", "tall-fan", "rose"]
    },
    round: {
      name: "Round",
      blurb: "Soft, equal in width and length, with full cheeks. The right gele lengthens the face and adds vertical lift.",
      principle: "Choose height over width. Peaks, vertical pleats and asymmetric folds slim and elongate.",
      matches: ["tall-fan", "peaked-pleats", "asymmetric"]
    },
    square: {
      name: "Square",
      blurb: "Strong jawline, parallel forehead and chin. The crown should soften the angles rather than echo them.",
      principle: "Choose curves over corners. Rounded blooms and soft halos balance an architectural jaw.",
      matches: ["rose", "soft-halo", "wide-fan"]
    },
    heart: {
      name: "Heart",
      blurb: "Wider through the forehead and cheekbones, narrowing to a delicate chin. Balance is created low.",
      principle: "Add volume below the brow line. Wider, lower-seated geles balance a narrow chin.",
      matches: ["wide-fan", "soft-halo", "rose"]
    },
    oblong: {
      name: "Oblong",
      blurb: "Longer than it is wide, with a higher forehead. The right gele introduces width and breaks the line.",
      principle: "Choose width, not height. Horizontal volume and lower placement shorten the face visually.",
      matches: ["wide-fan", "soft-halo", "layered-pleats"]
    },
    diamond: {
      name: "Diamond",
      blurb: "Narrow forehead and chin with prominent cheekbones. The crown softens the cheek line.",
      principle: "Frame, don't compete. Soft halos and gentle asymmetry distract from cheek width.",
      matches: ["soft-halo", "asymmetric", "rose"]
    }
  };

  const STYLES = {
    "asymmetric": {
      name: "Asymmetric Pleats",
      origin: "Yoruba · Modern",
      desc: "A diagonal sweep of pleats anchored on one side and fanning to the other. The lines lengthen the face and create a flattering off-balance crown.",
      why: "The diagonal draws the eye upward and across — ideal for elongating round and softening diamond."
    },
    "tall-fan": {
      name: "Tall Fan",
      origin: "Bridal · Lagos",
      desc: "A towering fan-pleated crown that rises sharply from a narrow base. The most ceremonial silhouette in the canon — heavy, structured, statement.",
      why: "Vertical height adds elegant length to round faces and reads as regal on oval."
    },
    "wide-fan": {
      name: "Wide Fan",
      origin: "Occasion · Aso-Ebi",
      desc: "Horizontal volume — broad, halo-like pleats that spread wider than they rise. Soft and stately, the favourite of family ceremonies.",
      why: "Adds width to long or narrow faces and balances a heart shape's narrow chin."
    },
    "rose": {
      name: "Rose Bloom",
      origin: "Modern · Pan-African",
      desc: "A single length of fabric twisted into a generous flower, pinned at the temple. Romantic, sculptural and unmistakably contemporary.",
      why: "The asymmetric softness flatters square jawlines and gives diamond shapes a graceful focal point."
    },
    "soft-halo": {
      name: "Soft Halo",
      origin: "Everyday Elegance",
      desc: "A rounded, gently-pleated halo that hugs the head — no sharp peaks, no heavy structure. The Sunday gele.",
      why: "Frames diamond and oblong without competing; the curve softens square's strong jaw."
    },
    "peaked-pleats": {
      name: "Peaked Brocade",
      origin: "Architectural · Owambe",
      desc: "Knife-sharp vertical pleats meeting at a single peak above the brow. The most architectural cut — drama in pleat form.",
      why: "The single point delivers dramatic vertical lift — the ideal antidote to a round silhouette."
    },
    "layered-pleats": {
      name: "Layered Pleats",
      origin: "Heritage · Aso-Oke",
      desc: "Tier upon tier of horizontal folds, building a layered silhouette without much height. Heavy hand-loomed cloth, traditionally Yoruba.",
      why: "Stacked horizontal lines visually shorten oblong faces and add gentle width."
    }
  };

  const shapeBtns = document.querySelectorAll('.shape-btn');
  const meta      = document.getElementById('finder-meta');
  const accordion = document.getElementById('finder-accordion');
  if (!shapeBtns.length || !meta || !accordion) return;

  function render(shapeKey) {
    const shape = SHAPES[shapeKey];
    if (!shape) return;

    meta.innerHTML = `
      <div class="finder-meta-card">
        <p class="eyebrow gold-eyebrow">${shape.name.toUpperCase()} FACE</p>
        <p class="finder-meta-blurb">${shape.blurb}</p>
        <p class="finder-meta-rule"><strong>The principle ·</strong> ${shape.principle}</p>
      </div>
    `;

    accordion.innerHTML = shape.matches.map((id, idx) => {
      const s = STYLES[id]; if (!s) return '';
      const isOpen = idx === 0;
      return `
        <details class="acc-item${isOpen ? ' is-open' : ''}"${isOpen ? ' open' : ''}>
          <summary>
            <span class="acc-rank">0${idx + 1}</span>
            <span class="acc-title">
              <span class="acc-name">${s.name}</span>
              <span class="acc-origin">${s.origin}</span>
            </span>
            <span class="acc-icon"><i class="fa-solid fa-plus"></i></span>
          </summary>
          <div class="acc-body">
            <p>${s.desc}</p>
            <p class="acc-why"><strong>Why it suits you · </strong>${s.why}</p>
            <a href="shop.html" class="link-arrow">Find this style <i class="fa-solid fa-arrow-right"></i></a>
          </div>
        </details>
      `;
    }).join('');

    // Plus/minus toggle without breaking accordion
    accordion.querySelectorAll('details').forEach(d => {
      d.addEventListener('toggle', () => d.classList.toggle('is-open', d.open));
    });
  }

  shapeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      shapeBtns.forEach(b => { b.classList.remove('is-active'); b.setAttribute('aria-selected', 'false'); });
      btn.classList.add('is-active');
      btn.setAttribute('aria-selected', 'true');
      render(btn.dataset.shape);
    });
  });

  render('oval');
})();
