// Tiny synchronous pub/sub. Shared by netcon and dump_manager so the
// listener bookkeeping lives in one place instead of being copy-pasted.
module.exports = function createEmitter() {
    const listeners = new Set();

    return {
        // Returns an unsubscribe function.
        add(fn) {
            listeners.add(fn);
            return () => listeners.delete(fn);
        },
        emit(event) {
            for (const fn of listeners) fn(event);
        },
    };
};
