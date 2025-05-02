import { useEffect, useRef } from 'react';

export const useRAFInterval = (cb: (dt: number) => void, running: boolean) => {
    const cbRef = useRef(cb);
    cbRef.current = cb;

    const frame = useRef<number>();

    useEffect(() => {
        if (!running) return;
        let prev = performance.now();

        const loop = (now: number) => {
            const dt = now - prev;
            prev = now;
            cbRef.current(dt);
            frame.current = requestAnimationFrame(loop);
        };

        frame.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frame.current!);
    }, [running]);
};
