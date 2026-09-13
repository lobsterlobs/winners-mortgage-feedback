(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const params = new URLSearchParams(location.search);
  const safe = (value, max = 60) => String(value || "").replace(/[<>"'`]/g, "").trim().slice(0, max);

  const staffMode = params.get("staff") === "true";
  const clientName = safe(params.get("name"));
  const clientId = safe(params.get("client")) || "demo";
  const incomingRef = safe(params.get("ref"), 20).toUpperCase();
  const isDemo = params.get("demo") === "true";
  const requestedAdvisorCode = safe(params.get("advisor"), 10).toUpperCase();
  const advisorCode = CONFIG.consultants[requestedAdvisorCode]
    ? requestedAdvisorCode
    : CONFIG.defaultConsultantCode;
  const advisor = CONFIG.consultants[advisorCode];

  function applyConfiguredCopy() {
    const introGift = $("intro-gift-text");
    const referralThanks = $("referral-thank-you-text");
    if (introGift && CONFIG.introGiftText) introGift.textContent = CONFIG.introGiftText;
    if (referralThanks && CONFIG.referralThankYouText) referralThanks.textContent = CONFIG.referralThankYouText;
  }

  const surveyKey = `${CONFIG.surveyStorageKey}:${advisorCode}:${clientId}`;
  const referralKey = `${CONFIG.referralStorageKey}:${advisorCode}:${clientId}`;

  const state = {
    step: 1,
    rating: null,
    clearInformation: null,
    wouldRecommend: null,
    referralCode: "",
    referralUrl: "",
    qrCanvas: null,
    staffQrCanvas: null,
    staffSurveyUrl: ""
  };

  const storage = {
    get: (key) => { try { return localStorage.getItem(key); } catch { return null; } },
    set: (key, value) => { try { localStorage.setItem(key, value); } catch {} },
    remove: (key) => { try { localStorage.removeItem(key); } catch {} }
  };

  function toast(message) {
    const el = $("toast");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove("show"), 2300);
  }

  function stableHash(input) {
    let hash = 2166136261;
    for (let i = 0; i < input.length; i += 1) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function randomBlock(length = 8) {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = new Uint8Array(length);
    if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
    else bytes.forEach((_, index) => { bytes[index] = Math.floor(Math.random() * 256); });
    return [...bytes].map((byte) => alphabet[byte % alphabet.length]).join("");
  }

  function formatCode(raw) {
    const normalized = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").padEnd(8, "X").slice(0, 8);
    return `${CONFIG.codePrefix}-${normalized.slice(0, 4)}-${normalized.slice(4)}`;
  }

  function generateReferralCode(identifier = clientId) {
    const old = storage.get(referralKey);
    if (old && /^WG-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(old)) return old;

    let raw;
    if (identifier !== "demo") {
      raw = stableHash(`${advisorCode}:${identifier}`).toString(36)
        + stableHash(`${identifier}:${advisor.name}`).toString(36);
    } else {
      raw = randomBlock();
    }
    const code = formatCode(raw);
    storage.set(referralKey, code);
    return code;
  }

  function currentBase() {
    return `${location.origin}${location.pathname}`;
  }

  function buildSurveyUrl(name = "", id = "") {
    const url = new URL(currentBase());
    url.searchParams.set("advisor", advisorCode);
    if (name) url.searchParams.set("name", name);
    if (id) url.searchParams.set("client", id);
    return url.toString();
  }

  function buildReferralUrl(code) {
    const cardBase = advisor.cardUrl || advisor.website || CONFIG.brandWebsite;
    const url = new URL(cardBase);
    url.searchParams.set("ref", code);
    url.searchParams.set("advisor", advisorCode);
    return url.toString();
  }

  function setStep(step, focus = true) {
    state.step = step;
    $$(".question").forEach((question) => {
      const active = Number(question.dataset.step) === step;
      question.hidden = !active;
      question.classList.toggle("active", active);
    });
    const percent = { 1: 33, 2: 66, 3: 100 }[step];
    $("question-counter").textContent = `Въпрос ${step} от 3`;
    $("progress-percent").textContent = `${percent}%`;
    $("progress-bar").style.width = `${percent}%`;
    if (focus) {
      const question = document.querySelector(`.question[data-step="${step}"]`);
      question?.querySelector("legend,button")?.focus({ preventScroll: true });
    }
  }

  function validate(step) {
    if (step === 1 && !state.rating) {
      toast("Изберете оценка от 1 до 5");
      return false;
    }
    if (step === 2 && !state.clearInformation) {
      toast("Изберете отговор");
      return false;
    }
    if (step === 3 && !state.wouldRecommend) {
      toast("Изберете Да или Не");
      return false;
    }
    return true;
  }

  function saveSurvey() {
    const payload = {
      surveyId: globalThis.crypto?.randomUUID?.() || `survey-${Date.now()}`,
      clientId,
      advisorCode,
      rating: state.rating,
      clearInformation: state.clearInformation,
      wouldRecommend: state.wouldRecommend,
      submittedAt: new Date().toISOString(),
      referralCode: state.referralCode
    };
    storage.set(surveyKey, JSON.stringify(payload));
    return payload;
  }

  function resetSurvey({ scroll = true } = {}) {
    state.step = 1;
    state.rating = null;
    state.clearInformation = null;
    state.wouldRecommend = null;
    $$("[data-rating],[data-info],[data-recommend]").forEach((button) => button.setAttribute("aria-pressed", "false"));
    $("submit-survey").innerHTML = 'Изпрати и виж ваучера <svg><use href="#i-gift"></use></svg>';
    $("survey-card").hidden = false;
    $("success-section").hidden = true;
    $("referral-section").hidden = true;
    setStep(1, false);
    if (scroll) {
      $("survey").scrollIntoView({ behavior: "smooth" });
      setTimeout(() => setStep(1), 350);
    }
  }

  function makeTags() {
    const tags = CONFIG.voucherProducts.map((product) => {
      const span = document.createElement("span");
      span.textContent = product;
      return span;
    });
    $("product-tags").replaceChildren(...tags);
  }

  function generateQrCode() {
    const box = $("personal-qr");
    box.replaceChildren();
    state.qrCanvas = WGQRCode.render(box, state.referralUrl, {
      size: 260,
      margin: 10,
      dark: "#050505",
      light: "#ffffff"
    });
  }

  function updateReferral() {
    state.referralCode = generateReferralCode();
    state.referralUrl = buildReferralUrl(state.referralCode);
    $("referral-code").textContent = state.referralCode;
    $("referral-url").value = state.referralUrl;
    $("referral-consultant-name").textContent = advisor.name;
    generateQrCode();

    const message = `${CONFIG.referralShareText} ${state.referralUrl}`;
    $("share-whatsapp").href = `https://wa.me/?text=${encodeURIComponent(message)}`;
    $("share-email").href = `mailto:?subject=${encodeURIComponent("Препоръка за ипотечен кредит")}&body=${encodeURIComponent(message)}`;

    const viber = $("share-viber");
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      viber.href = `viber://forward?text=${encodeURIComponent(message)}`;
      viber.hidden = false;
    } else {
      viber.hidden = true;
    }
  }

  async function copy(text, successMessage = "Линкът е копиран") {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    toast(successMessage);
  }

  async function shareReferral() {
    const text = `${CONFIG.referralShareText} ${state.referralUrl}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Уиннърс Ипотека", text, url: state.referralUrl });
        return;
      } catch (error) {
        if (error.name === "AbortError") return;
      }
    }
    copy(state.referralUrl);
  }

  function downloadCanvas(canvas, name) {
    const link = document.createElement("a");
    link.download = name;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  function downloadQrCode() {
    if (!state.qrCanvas) generateQrCode();
    downloadCanvas(state.qrCanvas, `Winners-QR2-${state.referralCode}.png`);
    toast("QR 2 е изтеглен");
  }

  function revealResult() {
    $("survey-card").hidden = true;
    $("success-section").hidden = false;
    updateReferral();
    $("referral-section").hidden = false;
    $("success-message").textContent = "Мнението Ви е получено. По-долу ще видите ваучера, линка към Вашия консултант и неговия номер.";
    $("success-section").scrollIntoView({ behavior: "smooth" });
  }

  function setMultilineName(element, name) {
    const parts = name.toUpperCase().split(/\s+/).filter(Boolean);
    element.replaceChildren();
    parts.forEach((part, index) => {
      if (index) element.appendChild(document.createElement("br"));
      element.appendChild(document.createTextNode(part));
    });
  }

  function initArrival() {
    $("client-experience").hidden = true;
    $("staff-view").hidden = true;
    $("referral-arrival").hidden = false;
    $("incoming-ref-code").textContent = incomingRef;
    $("arrival-consultant-name").textContent = advisor.name;
    setMultilineName($("arrival-card-name"), advisor.name);
    $("arrival-card-role").textContent = advisor.role.toUpperCase();

    $("arrival-phone").href = `tel:${advisor.phoneHref}`;
    $("arrival-phone").querySelector("span").textContent = advisor.phone;
    $("arrival-email").href = `mailto:${advisor.email}`;
    $("arrival-email").querySelector("span").textContent = advisor.email;
    $("arrival-website").href = advisor.website;
    $("arrival-website").querySelector("span").textContent = advisor.website.replace(/^https?:\/\//, "").replace(/\/$/, "");
    $("arrival-address").textContent = advisor.address;

    $("ref-call").href = `tel:${advisor.phoneHref}`;
    $("ref-whatsapp").href = `https://wa.me/${advisor.whatsappPhone}?text=${encodeURIComponent(`Здравейте, получих препоръка с код ${incomingRef} и се интересувам от ипотечен кредит.`)}`;
    $("ref-viber").href = `viber://chat?number=${encodeURIComponent(advisor.viberPhone)}`;
    $("ref-email").href = `mailto:${advisor.email}?subject=${encodeURIComponent(`Ипотечна консултация · ${incomingRef}`)}&body=${encodeURIComponent(`Здравейте, получих препоръка с код ${incomingRef}.`)}`;
  }

  function refreshStaffQr() {
    const name = safe($("staff-client-name").value, 40);
    const id = safe($("staff-client-id").value, 40);
    state.staffSurveyUrl = buildSurveyUrl(name, id);
    $("staff-survey-url").value = state.staffSurveyUrl;
    $("staff-open-link").href = state.staffSurveyUrl;
    const box = $("staff-survey-qr");
    box.replaceChildren();
    state.staffQrCanvas = WGQRCode.render(box, state.staffSurveyUrl, {
      size: 280,
      margin: 10,
      dark: "#050505",
      light: "#ffffff"
    });
  }

  function initStaff() {
    $("client-experience").hidden = true;
    $("referral-arrival").hidden = true;
    $("staff-view").hidden = false;
    $("staff-consultant-name").textContent = advisor.name;
    refreshStaffQr();

    $("staff-client-name").addEventListener("input", refreshStaffQr);
    $("staff-client-id").addEventListener("input", refreshStaffQr);
    $("staff-copy-link").addEventListener("click", () => copy(state.staffSurveyUrl, "Линкът към анкетата е копиран"));
    $("staff-copy-field").addEventListener("click", () => copy(state.staffSurveyUrl, "Линкът към анкетата е копиран"));
    $("staff-download-qr").addEventListener("click", () => {
      if (!state.staffQrCanvas) refreshStaffQr();
      const suffix = safe($("staff-client-id").value, 20) || advisorCode;
      downloadCanvas(state.staffQrCanvas, `Winners-QR1-Anketa-${suffix}.png`);
      toast("QR 1 е изтеглен");
    });
  }

  function bind() {
    $("start-survey").addEventListener("click", () => $("survey").scrollIntoView({ behavior: "smooth" }));

    $$("[data-rating]").forEach((button) => button.addEventListener("click", () => {
      state.rating = Number(button.dataset.rating);
      $$("[data-rating]").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    }));

    $$("[data-info]").forEach((button) => button.addEventListener("click", () => {
      state.clearInformation = button.dataset.info;
      $$("[data-info]").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    }));

    $$('[data-recommend]').forEach((button) => button.addEventListener("click", () => {
      state.wouldRecommend = button.dataset.recommend;
      $$('[data-recommend]').forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    }));

    $$(".next").forEach((button) => button.addEventListener("click", () => {
      if (validate(state.step)) setStep(Number(button.dataset.next));
    }));
    $$(".back").forEach((button) => button.addEventListener("click", () => setStep(Number(button.dataset.back))));

    $("survey-form").addEventListener("submit", (event) => {
      event.preventDefault();
      if (!validate(3)) return;
      saveSurvey();
      revealResult();
      toast("Мнението Ви е изпратено");
    });

    $("repeat-survey").addEventListener("click", () => resetSurvey());
    $("copy-link").addEventListener("click", () => copy(state.referralUrl));
    $("copy-link-text").addEventListener("click", () => copy(state.referralUrl));
    $("native-share").addEventListener("click", shareReferral);
    $("download-qr").addEventListener("click", downloadQrCode);

    $("demo-reset").addEventListener("click", () => {
      if (confirm("Да нулираме ли тестовите данни?")) {
        storage.remove(surveyKey);
        storage.remove(referralKey);
        location.reload();
      }
    });
  }

  function init() {
    applyConfiguredCopy();
    if (staffMode) {
      initStaff();
      return;
    }
    if (incomingRef) {
      initArrival();
      return;
    }

    makeTags();
    $("hero-consultant-name").textContent = advisor.name;
    if (clientName) {
      $("hero-title").replaceChildren(
        document.createTextNode(`${clientName}, благодарим Ви`),
        document.createElement("br"),
        Object.assign(document.createElement("span"), { textContent: "за доверието" })
      );
    }
    if (isDemo) $("demo-reset").hidden = false;
    state.referralCode = generateReferralCode();
    state.referralUrl = buildReferralUrl(state.referralCode);
    resetSurvey({ scroll: false });
    bind();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
