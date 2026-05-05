import { create } from "zustand";
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { collection, doc, setDoc, onSnapshot, deleteDoc, query, where, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

export const useAppStore = create((set, get) => ({
    // Auth State
    user: null,
    authLoading: true,

    // App State
    apps: [],
    cvLibrary: [],
    jobHuntResults: [],
    weeklyGoal: 10,
    dark: true,
    view: "dashboard",
    googleAccessToken: null, // Store token for Gmail API

    // UI State
    notification: null,

    // Actions
    setDark: (dark) => set({ dark }),
    setView: (view) => set({ view }),
    setJobHuntResults: (jobHuntResults) => set({ jobHuntResults }),
    setNotification: (notification) => {
        set({ notification });
        setTimeout(() => set({ notification: null }), 3000);
    },

    // Auth Actions
    loginWithGoogle: async () => {
        try {
            const provider = new GoogleAuthProvider();
            provider.addScope('https://www.googleapis.com/auth/gmail.readonly');

            const result = await signInWithPopup(auth, provider);

            // This gives you a Google Access Token. You can use it to access the Google API.
            const credential = GoogleAuthProvider.credentialFromResult(result);
            if (credential) {
                const token = credential.accessToken;
                set({ googleAccessToken: token });
                // We don't save this to Firestore, just keep in app memory for the session
            }

        } catch (error) {
            get().setNotification({ msg: error.message, type: "error" });
        }
    },
    logout: async () => {
        await signOut(auth);
        set({ apps: [], cvLibrary: [], googleAccessToken: null }); // Clear data on logout
    },

    // Database Actions (Applications)
    saveApplication: async (appData) => {
        const { user } = get();
        if (!user) return;
        try {
            const isNew = !appData.id;
            const id = appData.id || crypto.randomUUID();
            const docRef = doc(db, "users", user.uid, "applications", id);
            const dataToSave = {
                ...appData,
                id,
                userId: user.uid,
                updatedAt: serverTimestamp(),
            };
            if (isNew) dataToSave.createdAt = serverTimestamp();

            await setDoc(docRef, dataToSave, { merge: true });
            get().setNotification({ msg: "Application saved!", type: "success" });
        } catch (error) {
            get().setNotification({ msg: "Failed to save application", type: "error" });
        }
    },
    deleteApplication: async (id) => {
        const { user } = get();
        if (!user) return;
        try {
            await deleteDoc(doc(db, "users", user.uid, "applications", id));
            get().setNotification({ msg: "Application deleted", type: "success" });
        } catch (error) {
            get().setNotification({ msg: "Failed to delete application", type: "error" });
        }
    },
    deleteAllApplications: async () => {
        const { user, apps } = get();
        if (!user) return;
        if (apps.length === 0) {
            get().setNotification({ msg: "No applications to delete.", type: "error" });
            return;
        }
        if (!window.confirm(`Are you sure you want to delete ALL ${apps.length} applications? This action cannot be undone.`)) return;

        try {
            for (const app of apps) {
                await deleteDoc(doc(db, "users", user.uid, "applications", app.id));
            }
            get().setNotification({ msg: "All applications deleted successfully", type: "success" });
        } catch (error) {
            get().setNotification({ msg: "Failed to delete all applications", type: "error" });
        }
    },
    updateApplicationStatus: async (id, newStatus) => {
        const { user } = get();
        if (!user) return;
        try {
            await setDoc(doc(db, "users", user.uid, "applications", id), { status: newStatus, updatedAt: serverTimestamp() }, { merge: true });
        } catch (error) {
            get().setNotification({ msg: "Failed to update status", type: "error" });
        }
    },

    // Discovery: save a batch of scored discovered jobs to Firestore, deduped
    saveDiscoveredJobs: async (jobs) => {
        const { user, apps } = get();
        if (!user) return 0;

        // Build dedup sets from existing apps (normalize to lowercase for consistent matching)
        const existingUrls = new Set(apps.map(a => (a.jobUrl || "").toLowerCase().trim()).filter(Boolean));
        const existingCombos = new Set(apps.map(a =>
            `${(a.company || "").toLowerCase().trim()}::${(a.role || "").toLowerCase().trim()}`
        ));

        // Load skipped URLs from localStorage
        let skippedUrls = new Set();
        try {
            const raw = localStorage.getItem("applyiq_skipped_urls");
            if (raw) skippedUrls = new Set(JSON.parse(raw));
        } catch {}

        let saved = 0;
        for (const job of jobs) {
            const urlKey = (job.url || "").toLowerCase().trim();
            const comboKey = `${(job.company || "").toLowerCase().trim()}::${(job.title || "").toLowerCase().trim()}`;
            if (urlKey && (existingUrls.has(urlKey) || skippedUrls.has(urlKey))) continue;
            if (existingCombos.has(comboKey)) continue;

            const id = crypto.randomUUID();
            try {
                await setDoc(doc(db, "users", user.uid, "applications", id), {
                    id,
                    userId: user.uid,
                    status: "Discovered",
                    company: job.company,
                    role: job.title,
                    date: new Date().toISOString().slice(0, 10),
                    source: job.source === "linkedin" ? "LinkedIn" : job.source === "indeed" ? "Indeed" : "Company Site",
                    priority: "Target",
                    salary: job.salary || "",
                    notes: "",
                    jobUrl: job.url || null,
                    jobDescription: job.description || null,
                    externalId: job.externalId || null,
                    discoverySource: job.source || null,
                    discoveryScore: job.discoveryScore || 0,
                    discoveryScoreBreakdown: job.discoveryScoreBreakdown || null,
                    sponsorTier: job.sponsorTier || "unknown",
                    discoveredAt: serverTimestamp(),
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
                existingUrls.add(urlKey);
                existingCombos.add(comboKey);
                saved++;
            } catch (err) {
                console.error("saveDiscoveredJob error:", err);
            }
        }
        return saved;
    },

    // Discovery: approve — move from Discovered to Applied
    approveDiscovery: async (id) => {
        const { user } = get();
        if (!user) return;
        try {
            await setDoc(doc(db, "users", user.uid, "applications", id), {
                status: "Applied",
                date: new Date().toISOString().slice(0, 10),
                updatedAt: serverTimestamp(),
            }, { merge: true });
            get().setNotification({ msg: "Marked as Applied!", type: "success" });
        } catch {
            get().setNotification({ msg: "Failed to update status", type: "error" });
        }
    },

    // Discovery: skip — delete from Firestore + store URL in localStorage skiplist
    skipDiscovery: async (id) => {
        const { user, apps } = get();
        if (!user) return;
        const app = apps.find(a => a.id === id);
        if (app?.jobUrl) {
            try {
                const raw = localStorage.getItem("applyiq_skipped_urls");
                const arr = raw ? JSON.parse(raw) : [];
                arr.push(app.jobUrl.toLowerCase().trim());
                localStorage.setItem("applyiq_skipped_urls", JSON.stringify(arr));
            } catch {}
        }
        try {
            await deleteDoc(doc(db, "users", user.uid, "applications", id));
        } catch {
            get().setNotification({ msg: "Failed to skip job", type: "error" });
        }
    },

    // Database Actions (CVs)
    saveCv: async (cvData) => {
        const { user } = get();
        if (!user) return;
        try {
            const id = cvData.id || crypto.randomUUID();

            // Save PDF base64 in localStorage (free, no Firestore size limits)
            if (cvData.base64) {
                localStorage.setItem(`applyiq_cv_${id}`, cvData.base64);
            }

            // Save only metadata to Firestore
            const docRef = doc(db, "users", user.uid, "cvs", id);
            const dataToSave = {
                id,
                name: cvData.name,
                fileName: cvData.fileName || null,
                userId: user.uid,
            };
            if (get().cvLibrary.length === 0) dataToSave.isDefault = true;

            await setDoc(docRef, dataToSave, { merge: true });
            get().setNotification({ msg: "CV added to library!", type: "success" });
        } catch (error) {
            get().setNotification({ msg: `Failed to save CV: ${error.message}`, type: "error" });
        }
    },
    deleteCv: async (id) => {
        const { user } = get();
        if (!user) return;
        try {
            localStorage.removeItem(`applyiq_cv_${id}`);
            await deleteDoc(doc(db, "users", user.uid, "cvs", id));
            get().setNotification({ msg: "CV deleted", type: "success" });
        } catch (error) {
            get().setNotification({ msg: "Failed to delete CV", type: "error" });
        }
    },
    setDefaultCv: async (id) => {
        const { user, cvLibrary } = get();
        if (!user) return;
        try {
            // First, un-default all others
            cvLibrary.forEach(cv => {
                if (cv.isDefault) {
                    setDoc(doc(db, "users", user.uid, "cvs", cv.id), { isDefault: false }, { merge: true });
                }
            });
            // Set new default
            await setDoc(doc(db, "users", user.uid, "cvs", id), { isDefault: true }, { merge: true });
            get().setNotification({ msg: "Default CV updated", type: "success" });
        } catch (error) {
            get().setNotification({ msg: "Failed to update default CV", type: "error" });
        }
    },

    // Goal
    saveWeeklyGoal: async (goal) => {
        const { user } = get();
        set({ weeklyGoal: goal });
        if (!user) return;
        try {
            await setDoc(doc(db, "users", user.uid, "settings", "preferences"), { weeklyGoal: goal }, { merge: true });
            get().setNotification({ msg: "Weekly goal updated", type: "success" });
        } catch (error) { }
    },

    // Subscriptions setup function
    initStore: () => {
        // 1. Listen for Auth Changes
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            set({ user, authLoading: false });

            if (user) {
                // 2. Fetch User Settings
                onSnapshot(doc(db, "users", user.uid, "settings", "preferences"), (docSnap) => {
                    if (docSnap.exists() && docSnap.data().weeklyGoal) {
                        set({ weeklyGoal: docSnap.data().weeklyGoal });
                    }
                });

                // 3. Listen to Applications collection
                const qApps = query(collection(db, "users", user.uid, "applications"));
                onSnapshot(qApps, (snapshot) => {
                    const appsData = [];
                    snapshot.forEach((doc) => appsData.push({ id: doc.id, ...doc.data() }));
                    // Sort by date descending (assuming dates are YYYY-MM-DD strings like in the original app)
                    appsData.sort((a, b) => new Date(b.date) - new Date(a.date));
                    set({ apps: appsData });
                });

                // 4. Listen to CV Library collection
                const qCvs = query(collection(db, "users", user.uid, "cvs"));
                onSnapshot(qCvs, (snapshot) => {
                    const cvsData = [];
                    snapshot.forEach((doc) => cvsData.push({ id: doc.id, ...doc.data() }));
                    set({ cvLibrary: cvsData });
                });
            }
        });

        return unsubscribeAuth; // Return cleanup function
    }
}));
