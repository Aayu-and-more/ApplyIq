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
    weeklyGoal: 10,
    dark: true,
    view: "dashboard",

    // UI State
    notification: null,

    // Actions
    setDark: (dark) => set({ dark }),
    setView: (view) => set({ view }),
    setNotification: (notification) => {
        set({ notification });
        setTimeout(() => set({ notification: null }), 3000);
    },

    // Auth Actions
    loginWithGoogle: async () => {
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        } catch (error) {
            get().setNotification({ msg: error.message, type: "error" });
        }
    },
    logout: async () => {
        await signOut(auth);
        set({ apps: [], cvLibrary: [] }); // Clear data on logout
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
    updateApplicationStatus: async (id, newStatus) => {
        const { user } = get();
        if (!user) return;
        try {
            await setDoc(doc(db, "users", user.uid, "applications", id), { status: newStatus, updatedAt: serverTimestamp() }, { merge: true });
        } catch (error) {
            get().setNotification({ msg: "Failed to update status", type: "error" });
        }
    },

    // Database Actions (CVs)
    saveCv: async (cvData) => {
        const { user } = get();
        if (!user) return;
        try {
            const isNew = !cvData.id;
            const id = cvData.id || crypto.randomUUID();
            const docRef = doc(db, "users", user.uid, "cvs", id);
            const dataToSave = {
                ...cvData,
                id,
                userId: user.uid,
            };

            // If this is the first CV, make it default
            if (get().cvLibrary.length === 0) {
                dataToSave.isDefault = true;
            }

            await setDoc(docRef, dataToSave, { merge: true });
            get().setNotification({ msg: "CV added to library!", type: "success" });
        } catch (error) {
            get().setNotification({ msg: "Failed to save CV", type: "error" });
        }
    },
    deleteCv: async (id) => {
        const { user } = get();
        if (!user) return;
        try {
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
