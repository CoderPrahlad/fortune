import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import api from '../api/axios';
import './Wallet.css';

export default function Wallet() {
  const { coins, bonus, withdrawable, siteSettings, applyCoins } = useAuth();
  const location = useLocation();
  const { showToast } = useUI();
  const [showDep, setShowDep] = useState(false);
  const [showWith, setShowWith] = useState(false);
  const [depAmt, setDepAmt] = useState('');
  const [depProof, setDepProof] = useState('');
  const [withAmt, setWithAmt] = useState('');
  const [withMethod, setWithMethod] = useState('upi');
  const [withUpi, setWithUpi] = useState('');
  const [withName, setWithName] = useState('');
  const [withAccNo, setWithAccNo] = useState('');
  const [withIfsc, setWithIfsc] = useState('');
  const [withBank, setWithBank] = useState('');
  const [depTx, setDepTx] = useState([]);
  const [withTx, setWithTx] = useState([]);
  const [bonusTx, setBonusTx] = useState([]);

  useEffect(() => { loadWallet(); }, []);
  useEffect(() => { if (location.state?.openDeposit) { setShowDep(true); setShowWith(false); } }, [location.state]);

  const loadWallet = async () => {
    try {
      const d = await api.get('/wallet/transactions');
      const all = d?.transactions || d?.data?.transactions || [];
      setDepTx(all.filter(t => t.type === 'deposit'));
      setWithTx(all.filter(t => t.type === 'withdraw'));
      setBonusTx(all.filter(t => ['daily_bonus','refer_bonus','admin_add','joining_bonus'].includes(t.type)));

      const bal = await api.get('/wallet/balance');
      const balData = bal?.data || bal;
      if (balData?.success) applyCoins(balData);
    } catch(e) {
      console.error('Wallet load error:', e);
    }
  };

  const doDeposit = async () => {
    if (!depAmt || parseInt(depAmt) < 100) { showToast('⚠️ Min deposit ₹100', 'lose'); return; }
    if (!depProof) { showToast('⚠️ Transaction ID required', 'lose'); return; }
    const d = await api.post('/wallet/deposit', { amount: parseInt(depAmt), payment_proof: depProof, payment_method: 'UPI' });
    const res = d?.data || d;
    if (!res?.success) { showToast('❌ '+(res?.message||'Failed'), 'lose'); return; }
    showToast('✅ Deposit request submitted!', 'win');
    setDepAmt(''); setDepProof(''); setShowDep(false); loadWallet();
  };

  const doWithdraw = async () => {
    const amt = parseInt(withAmt);
    if (!amt || amt < 500) { showToast('⚠️ Min withdraw ₹500', 'lose'); return; }
    if (amt > (withdrawable || 0)) { showToast(`❌ Sirf Game Winning coins withdraw ho sakte hain! Available: ₹${withdrawable||0}`, 'lose'); return; }
    let proof = '';
    if (withMethod === 'upi') {
      if (!withUpi) { showToast('⚠️ UPI ID required', 'lose'); return; }
      proof = `UPI: ${withUpi}`;
    } else {
      if (!withName || !withAccNo || !withIfsc) { showToast('⚠️ Fill all bank details', 'lose'); return; }
      proof = `Bank | Name: ${withName} | Acc: ${withAccNo} | IFSC: ${withIfsc} | Bank: ${withBank}`;
    }
    const d = await api.post('/wallet/withdraw', { amount: amt, upi_id: proof });
    const res = d?.data || d;
    if (!res?.success) { showToast('❌ '+(res?.message||'Failed'), 'lose'); return; }
    showToast('✅ Withdrawal request submitted!', 'win');
    setWithAmt(''); setWithUpi(''); setWithName(''); setWithAccNo(''); setWithIfsc(''); setWithBank('');
    setShowWith(false); loadWallet();
  };

  const copyUpi = () => navigator.clipboard.writeText(siteSettings.upi_id || '').then(() => showToast('📋 UPI ID Copied!', 'info'));

  const txItem = (t) => {
    const isPlus = ['deposit','win','daily_bonus','refer_bonus','admin_add','joining_bonus'].includes(t.type);
    const icons = { deposit:'📥', withdraw:'📤', daily_bonus:'🎁', refer_bonus:'👥', admin_add:'⚙️', win:'🏆', loss:'💸', joining_bonus:'🎉' };
    const statusColor = { approved:'var(--teal)', rejected:'var(--red)', pending:'var(--gold)' };
    const statusIcon = { approved:'✅ APPROVED', rejected:'❌ REJECTED', pending:'⏳ PENDING' };
    return (
      <div key={t.id+'-'+t.type+'-'+t.created_at} className="tx-item">
        <div style={{flex:1}}>
          <div className="tx-type">{icons[t.type]||'💰'} {t.type.replace(/_/g,' ').toUpperCase()}</div>
          <div className="tx-date">{new Date(t.created_at).toLocaleString()}</div>
          {t.description && <div style={{fontSize:9,color:'#888',marginTop:2}}>{t.description}</div>}
        </div>
        <div style={{textAlign:'right'}}>
          <div className={'tx-amt '+(isPlus?'plus':'minus')}>{isPlus?'+':'-'}🪙{parseInt(t.amount).toLocaleString()}</div>
          {t.status && (
            <div style={{fontSize:9,fontWeight:700,marginTop:3,color:statusColor[t.status]||'#aaa'}}>
              {statusIcon[t.status]||t.status.toUpperCase()}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="page-scroll">
      <div className="wallet-hero">
        <div className="w-bal-row">
          <div className="w-bal-box">
            <div className="w-bal-title">TOTAL COINS</div>
            <div className="w-bal-amt" style={{color:'var(--gold)'}}>🪙 {parseInt(coins).toLocaleString()}</div>
          </div>
          <div className="w-bal-box">
            <div className="w-bal-title">BONUS COINS</div>
            <div className="w-bal-amt" style={{color:'var(--teal)'}}>🎁 {parseInt(bonus).toLocaleString()}</div>
            <div style={{fontSize:9,color:'var(--red)',marginTop:2}}>❌ Not Withdrawable</div>
          </div>
        </div>
        <div className="w-withdrawable-box">
          <div>
            <div style={{fontSize:10,color:'#aaa',letterSpacing:1}}>🏆 GAME WINNING COINS</div>
            <div style={{fontSize:11,color:'#aaa',marginTop:2}}>Only these can be withdrawn</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontFamily:'Orbitron',fontSize:18,fontWeight:900,color:'var(--green)'}}>🪙{parseInt(withdrawable||0).toLocaleString()}</div>
            <div style={{fontSize:9,color:'var(--green)',marginTop:2}}>✅ Withdrawable</div>
          </div>
        </div>
        <div className="w-rate">1 Coin = ₹1 &nbsp;|&nbsp; Min Withdraw ₹500</div>
      </div>

      <div className="wallet-actions">
        <div className="wact-btn dep" onClick={()=>{setShowDep(!showDep);setShowWith(false);}}>
          <span className="wact-icon">📥</span>DEPOSIT
        </div>
        <div className="wact-btn with" onClick={()=>{setShowWith(!showWith);setShowDep(false);}}>
          <span className="wact-icon">📤</span>WITHDRAW
        </div>
      </div>

      {showDep && (
        <div className="form-card show">
          <div className="form-card-hdr">
            <div className="form-card-title dep">📥 DEPOSIT COINS</div>
            <button className="form-close" onClick={()=>setShowDep(false)}>✕</button>
          </div>
          <div className="qr-payment-box">
            <div className="qr-title">SCAN & PAY</div>
            <div className="qr-img-wrap">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent('upi://pay?pa='+(siteSettings.upi_id||'casino@upi')+'&pn=LuckyFortune&cu=INR')}&size=140x140`} alt="QR" />
            </div>
            <div className="upi-id-box" onClick={copyUpi}>
              <span className="upi-id-text">{siteSettings.upi_id||'casino@upi'}</span>
              <button className="upi-copy-btn">COPY</button>
            </div>
            <div className="pay-steps"><b>1.</b> UPI se payment karo<br/><b>2.</b> Transaction ID copy karo<br/><b>3.</b> Neeche fill karo → Submit</div>
          </div>
          <div className="bonus-note">⚠️ Deposited coins sirf games khelne ke liye hain — directly withdraw nahi hote. Sirf Game se jeete coins withdraw ho sakte hain.</div>
          <div className="fg"><label>AMOUNT (₹)</label><input type="number" value={depAmt} onChange={e=>setDepAmt(e.target.value)} placeholder="Min ₹100" /></div>
          <div className="fg"><label>TRANSACTION ID</label><input value={depProof} onChange={e=>setDepProof(e.target.value)} placeholder="UTR / Transaction ID" /></div>
          <button className="submit-btn dep" onClick={doDeposit}>✅ SUBMIT DEPOSIT</button>
        </div>
      )}

      {showWith && (
        <div className="form-card show">
          <div className="form-card-hdr">
            <div className="form-card-title with">📤 WITHDRAW COINS</div>
            <button className="form-close" onClick={()=>setShowWith(false)}>✕</button>
          </div>
          <div className="with-info-box">
            <div>🏆 Sirf Game Winning Coins withdraw ho sakte hain!</div>
            <div style={{marginTop:4,fontFamily:'Orbitron',fontSize:13,color:'var(--green)',fontWeight:700}}>
              Available: 🪙{parseInt(withdrawable||0).toLocaleString()} = ₹{parseInt(withdrawable||0).toLocaleString()}
            </div>
          </div>
          <div className="fg"><label>COIN AMOUNT (=₹)</label><input type="number" value={withAmt} onChange={e=>setWithAmt(e.target.value)} placeholder="Min 500" /></div>
          <div className="fg">
            <label>PAYMENT METHOD</label>
            <div className="with-method-row">
              <div className={'with-method-btn'+(withMethod==='upi'?' active':'')} onClick={()=>setWithMethod('upi')}>💳 UPI</div>
              <div className={'with-method-btn'+(withMethod==='bank'?' active':'')} onClick={()=>setWithMethod('bank')}>🏦 Bank Transfer</div>
            </div>
          </div>
          {withMethod==='upi' && (
            <div className="fg"><label>UPI ID</label><input value={withUpi} onChange={e=>setWithUpi(e.target.value)} placeholder="yourname@upi / 9876543210@paytm" /></div>
          )}
          {withMethod==='bank' && (<>
            <div className="fg"><label>ACCOUNT HOLDER NAME</label><input value={withName} onChange={e=>setWithName(e.target.value)} placeholder="Jaise aadhar par naam hai" /></div>
            <div className="fg"><label>ACCOUNT NUMBER</label><input value={withAccNo} onChange={e=>setWithAccNo(e.target.value)} placeholder="Bank account number" /></div>
            <div className="fg"><label>IFSC CODE</label><input value={withIfsc} onChange={e=>setWithIfsc(e.target.value)} placeholder="e.g. SBIN0001234" /></div>
            <div className="fg"><label>BANK NAME</label><input value={withBank} onChange={e=>setWithBank(e.target.value)} placeholder="e.g. SBI, HDFC, Paytm Bank" /></div>
          </>)}
          <button className="submit-btn with" onClick={doWithdraw}>💸 SUBMIT WITHDRAW</button>
        </div>
      )}

      <div className="sec-sep">📥 DEPOSIT HISTORY</div>
      {depTx.length ? depTx.map(txItem) : <div className="empty">No deposits yet</div>}
      <div className="sec-sep">📤 WITHDRAW HISTORY</div>
      {withTx.length ? withTx.map(txItem) : <div className="empty">No withdrawals yet</div>}
      <div className="sec-sep">💳 BONUS & ADMIN TRANSACTIONS</div>
      {bonusTx.length ? bonusTx.map(txItem) : <div className="empty">No bonus transactions</div>}
    </div>
  );
}