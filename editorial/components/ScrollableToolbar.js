"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";

export default function ScrollableToolbar({ children, onKeyDown }) {
  const scrollRef = useRef(null);
  const trackRef = useRef(null);
  const leftArrowRef = useRef(null);
  const rightArrowRef = useRef(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  useEffect(() => {
    const scroller = scrollRef.current;
    function updateEdges() {
      const left = scroller.scrollLeft > 2;
      const right = scroller.scrollWidth - scroller.clientWidth - scroller.scrollLeft > 2;
      setEdges(previous => previous.left === left && previous.right === right ? previous : { left, right });
    }
    updateEdges();
    const observer = new ResizeObserver(updateEdges);
    observer.observe(scroller);
    observer.observe(trackRef.current);
    scroller.addEventListener("scroll", updateEdges, { passive: true });
    return () => { observer.disconnect(); scroller.removeEventListener("scroll", updateEdges); };
  }, []);

  function scroll(direction) {
    const scroller = scrollRef.current;
    const leftInset = leftArrowRef.current?.offsetWidth || 0;
    const rightInset = rightArrowRef.current?.offsetWidth || 0;
    const arrowWidth = leftInset || rightInset;
    const visibleStart = scroller.scrollLeft + leftInset;
    const visibleEnd = scroller.scrollLeft + scroller.clientWidth - rightInset;
    const controls = Array.from(trackRef.current.querySelectorAll("button, select"));
    // Continue with the first control that is not fully visible, including one
    // clipped by an arrow. Account for the opposite arrow appearing afterwards.
    const next = direction > 0
      ? controls.find(control => control.offsetLeft + control.offsetWidth > visibleEnd + 1)
      : controls.reverse().find(control => control.offsetLeft < visibleStart - 1);
    if (!next) return;
    const destination = direction > 0
      ? next.offsetLeft - arrowWidth
      : next.offsetLeft + next.offsetWidth - scroller.clientWidth + arrowWidth;
    scroller.scrollTo({
      left: Math.max(0, Math.min(destination, scroller.scrollWidth - scroller.clientWidth)),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  }

  return <div className="writing-toolbar-viewport">
    <div ref={scrollRef} className="writing-toolbar-tools" role="toolbar" aria-label="Pemformatan artikel" onKeyDown={onKeyDown}>
      <div ref={trackRef} className="writing-toolbar-track">{children}</div>
    </div>
    {edges.left && <button ref={leftArrowRef} type="button" className="writing-toolbar-scroll writing-toolbar-scroll-left" aria-label="Geser toolbar ke kiri" title="Alat sebelumnya" onMouseDown={event => event.preventDefault()} onClick={() => scroll(-1)}><ChevronLeftIcon aria-hidden="true" /></button>}
    {edges.right && <button ref={rightArrowRef} type="button" className="writing-toolbar-scroll writing-toolbar-scroll-right" aria-label="Geser toolbar ke kanan" title="Alat lainnya" onMouseDown={event => event.preventDefault()} onClick={() => scroll(1)}><ChevronRightIcon aria-hidden="true" /></button>}
  </div>;
}
