import { createContext, useContext, useState, useCallback, useRef } from 'react';

const UIContext = createContext(null);

export function UIProvider({ children }) {
  const [toast, setToast] = useState({ msg: '', cls: '', show: false });
  const [modal, setModal] = useState({ show: false, icon: '', title: '', body: '', amt: '' });
  const toastTimer = useRef(null);

  const showToast = useCallback((msg, cls = '') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, cls, show: true });
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, show: false })), 3200);
  }, []);

  const showModal = useCallback((icon, title, body, amt = '') => {
    setModal({ show: true, icon, title, body, amt });
  }, []);

  const closeModal = useCallback(() => setModal(m => ({ ...m, show: false })), []);

  const confetti = useCallback(() => {
    const cols = ['#FFD700','#FF2244','#00FF64','#00E5CC','#9B00FF','#FF8C00'];
    for (let i = 0; i < 50; i++) {
      const c = document.createElement('div');
      c.className = 'cf';
      c.style.cssText = `left:${Math.random()*100}vw;width:${4+Math.random()*6}px;height:${4+Math.random()*6}px;background:${cols[Math.floor(Math.random()*cols.length)]};animation-duration:${1.5+Math.random()*2.5}s;animation-delay:${Math.random()*.4}s;`;
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 4500);
    }
  }, []);

  return (
    <UIContext.Provider value={{ showToast, showModal, closeModal, confetti }}>
      {children}
      {/* Toast */}
      <div className={`toast${toast.show ? ' show' : ''}${toast.cls ? ' '+toast.cls : ''}`}>
        {toast.msg}
      </div>
      {/* Modal */}
      <div className={`modal-overlay${modal.show ? ' show' : ''}`} onClick={closeModal}>
        <div className="modal-box" onClick={e => e.stopPropagation()}>
          <span className="modal-icon">{modal.icon}</span>
          <div className="modal-title">{modal.title}</div>
          <div className="modal-body">{modal.body}</div>
          {modal.amt && <div className="modal-amt">{modal.amt}</div>}
          <button className="modal-close" onClick={closeModal}>OK</button>
        </div>
      </div>
    </UIContext.Provider>
  );
}

export const useUI = () => useContext(UIContext);
