"use client";

import React from "react";

// Entry point: go straight to the customer list (login removed).
export default function Home() {
  React.useEffect(() => {
    window.location.replace("/customers/");
  }, []);
  return null;
}
