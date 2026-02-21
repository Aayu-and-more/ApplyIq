import React from "react";
import { useAppStore } from "../store/useAppStore";

const Icon = ({ name, size = 16, color = "currentColor" }) => {
    return <span style={{ fontSize: size, color }}>Icon</span>;
};

export const LoginView = ({ t, S }) => {
    const { loginWithGoogle } = useAppStore();

    return (
        <div style={{ display: "flex", minHeight: "100vh", background: t.bg, fontFamily: "'DM Sans', system-ui, sans-serif", color: t.text, alignItems: "center", justifyContent: "center" }}>
            <div style={{ ...S.card, width: 400, maxWidth: "90%", padding: "40px 30px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.5px", color: t.accent, display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <Icon name="briefcase" size={24} color={t.accent} />ApplyIQ
                </div>
                <div style={{ fontSize: 13, color: t.textMuted, marginBottom: 32 }}>
                    Your ATS-Optimised Job Application Tracker
                </div>

                <button
                    onClick={loginWithGoogle}
                    style={{ ...S.btn("primary"), width: "100%", justifyContent: "center", padding: "12px", fontSize: 14 }}
                >
                    Sign in with Google
                </button>

                <div style={{ fontSize: 11, color: t.textMuted, marginTop: 24, opacity: 0.7 }}>
                    Your data is securely synced to the cloud
                </div>
            </div>
        </div>
    );
};
