import "server-only";
import { createElement } from "react";
import RabbaniEmailTemplate from "@/components/email/RabbaniEmailTemplate";

export async function renderRabbaniEmail(props = {}) {
  const { renderToStaticMarkup } = await import("react-dom/server");
  return `<!DOCTYPE html>${renderToStaticMarkup(createElement(RabbaniEmailTemplate, props))}`;
}

export { RabbaniEmailTemplate };
