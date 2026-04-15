"use client";

import type React from "react";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <main style={styles.wrapper}>
      <section style={styles.card}>
        <p style={styles.badge}>InsightForge AI</p>
        <h1 style={styles.title}>Something went wrong</h1>
        <p style={styles.text}>
          We could not load this page. Please try again.
        </p>
        {error?.message ? <p style={styles.muted}>{error.message}</p> : null}
        <button style={styles.button} onClick={reset} type="button">
          Try again
        </button>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "#f4f6fa",
    padding: "24px"
  },
  card: {
    width: "min(520px, 100%)",
    border: "1px solid #dde4ef",
    borderRadius: "14px",
    background: "#fff",
    padding: "24px",
    boxShadow: "0 12px 30px rgba(13, 20, 32, 0.08)"
  },
  badge: {
    margin: 0,
    color: "#1d4f95",
    fontWeight: 700,
    fontSize: "14px"
  },
  title: {
    margin: "10px 0 8px",
    color: "#131f33"
  },
  text: {
    margin: 0,
    color: "#4f6180"
  },
  muted: {
    margin: "10px 0 0",
    color: "#6c7e9c",
    fontSize: "13px"
  },
  button: {
    marginTop: "16px",
    border: 0,
    borderRadius: "10px",
    padding: "10px 14px",
    color: "#fff",
    background: "linear-gradient(90deg, #1e74d6, #2f86ea)",
    fontWeight: 700,
    cursor: "pointer"
  }
};
