// Contact — el email se copia al portapapeles, no abre un cliente de correo.

import { t } from "../../data/i18n.js";
import { initSite, getLang } from "./site.js";

const button = document.getElementById("copy-email");
const status = document.getElementById("copy-status");
const value = document.getElementById("email-value");

let hideTimer;

async function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      /* sin permiso: probamos el método viejo */
    }
  }

  try {
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.append(field);
    field.select();
    const copied = document.execCommand("copy");
    field.remove();
    return copied;
  } catch (error) {
    return false;
  }
}

async function handleCopy() {
  const email = value.textContent.trim();
  const copied = await copyToClipboard(email);

  // El diseño confirma siempre; acá distinguimos para no mentirle al usuario
  status.textContent = t(copied ? "contact.copied" : "contact.copyFail", getLang());
  status.classList.add("is-shown");

  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => status.classList.remove("is-shown"), 1300);
}

initSite();

if (button) button.addEventListener("click", handleCopy);
