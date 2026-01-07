import React, { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { X, Play, Pause, RotateCcw, Timer, Settings, Bell, BellOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import './TimerModal.css';

function TimerModal({ isOpen, onClose, game, user }) {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef(null);
  const prevIndexRef = useRef(null);
  const [alarmEnabled, setAlarmEnabled] = useState(() => {
    try { return localStorage.getItem('poker_timer_alarm') !== 'off'; } catch (_) { return true; }
  });
  const audioCtxRef = useRef(null);
  const [alarmType, setAlarmType] = useState(() => {
    try { return localStorage.getItem('poker_timer_alarm_type') || 'sine'; } catch (_) { return 'sine'; }
  });
  const [alarmPreset, setAlarmPreset] = useState(() => {
    try { return localStorage.getItem('poker_timer_alarm_preset') || 'beep_short'; } catch (_) { return 'beep_short'; }
  });
  const [alarmVolume, setAlarmVolume] = useState(() => {
    try { const v = parseFloat(localStorage.getItem('poker_timer_alarm_vol')); return isNaN(v) ? 0.2 : Math.max(0, Math.min(1, v)); } catch (_) { return 0.2; }
  });
  const [showSound, setShowSound] = useState(false);

  const authCfg = () => {
    try {
      const t = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      return t ? { headers: { Authorization: `Bearer ${t}` } } : {};
    } catch (_) { return {}; }
  };

  const fetchState = useCallback(async () => {
    try {
      const hasToken = typeof window !== 'undefined' ? !!localStorage.getItem('token') : false;
      console.debug('TimerModal: fetchState, tokenPresent=', hasToken, 'gameId=', game?.id);
      const res = await axios.get(`/api/games/${game.id}/timer`, authCfg());
      setState(res.data);
    } catch (e) {
      const status = e?.response?.status;
      console.debug('TimerModal: fetchState error status=', status);
      if (status === 401) {
        toast.error('Sessão expirada. Faça login novamente.');
      }
    }
  }, [game?.id]);

  const unlockAudio = async () => {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      audioCtxRef.current = audioCtxRef.current || (AC ? new AC() : null);
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
    } catch (_) {}
  };

  const playBeep = useCallback(async () => {
    if (!alarmEnabled) return;
    try {
      await unlockAudio();
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      const start = ctx.currentTime;
      const makeBeep = (startAt, freq, dur) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = alarmType;
        o.frequency.setValueAtTime(freq, startAt);
        g.gain.setValueAtTime(0, startAt);
        g.gain.linearRampToValueAtTime(alarmVolume, startAt + 0.06);
        g.gain.setValueAtTime(alarmVolume, startAt + Math.max(0, dur - 0.12));
        g.gain.exponentialRampToValueAtTime(0.0001, startAt + dur);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(startAt);
        o.stop(startAt + dur + 0.001);
      };
      const makeSweep = (startAt, startFreq, endFreq, dur) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = alarmType;
        o.frequency.setValueAtTime(startFreq, startAt);
        o.frequency.linearRampToValueAtTime(endFreq, startAt + Math.max(0.2, dur - 0.1));
        g.gain.setValueAtTime(0, startAt);
        g.gain.linearRampToValueAtTime(alarmVolume, startAt + 0.08);
        g.gain.exponentialRampToValueAtTime(0.0001, startAt + dur);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(startAt);
        o.stop(startAt + dur + 0.001);
      };
      if (alarmPreset === 'beep_short') {
        makeBeep(start, 880, 0.6);
      } else if (alarmPreset === 'alarm_2s') {
        makeBeep(start, 900, 2.0);
      } else if (alarmPreset === 'alarm_3s') {
        makeBeep(start, 900, 3.0);
      } else if (alarmPreset === 'alarm_4s') {
        makeBeep(start, 900, 4.0);
      } else if (alarmPreset === 'triple_beep') {
        makeBeep(start, 880, 0.5);
        makeBeep(start + 0.7, 880, 0.5);
        makeBeep(start + 1.4, 880, 0.5);
      } else if (alarmPreset === 'sweep_up_3s') {
        makeSweep(start, 600, 1200, 3.0);
      } else if (alarmPreset === 'sweep_down_3s') {
        makeSweep(start, 1200, 600, 3.0);
      } else if (alarmPreset === 'buzzer_2_5s') {
        makeBeep(start, 700, 0.4);
        makeBeep(start + 0.5, 700, 0.4);
        makeBeep(start + 1.0, 700, 0.4);
        makeBeep(start + 1.5, 700, 0.4);
        makeBeep(start + 2.0, 700, 0.4);
      } else {
        makeBeep(start, 880, 0.8);
      }
    } catch (_) {}
  }, [alarmEnabled, alarmType, alarmVolume, alarmPreset]);

  useEffect(() => {
    if (isOpen && game) {
      fetchState();
      intervalRef.current = setInterval(fetchState, 1000);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
  }, [isOpen, game, fetchState]);

  useEffect(() => {
    const idx = state?.current_index;
    if (idx == null) return;
    if (prevIndexRef.current == null) {
      prevIndexRef.current = idx;
      return;
    }
    if (idx !== prevIndexRef.current) {
      prevIndexRef.current = idx;
      try { console.debug('TimerModal: level advanced to index', idx); } catch (_) {}
      playBeep();
      const cur = state?.current;
      const msg = cur?.level === 'break' ? 'Break iniciado' : `Nível ${cur?.level} iniciado – SB ${cur?.sb} / BB ${cur?.bb}`;
      try { toast.success(msg, { duration: 2000 }); } catch (_) {}
    }
  }, [state, playBeep]);

  const start = async () => {
    setLoading(true);
    try {
      await unlockAudio();
      console.debug('TimerModal: start called, gameId=', game?.id);
      await axios.put(`/api/games/${game.id}/timer/start`, {}, authCfg());
      await fetchState();
      playBeep();
    } catch (e) {
      const status = e.response?.status;
      console.debug('TimerModal: start error status=', status);
      if (status === 400) {
        toast.error('Inicie o jogo antes de iniciar o timer');
      } else if (status === 401) {
        toast.error('Sessão expirada. Faça login novamente.');
      } else if (status === 403) {
        toast.error('Apenas administradores podem iniciar o timer');
      } else {
        toast.error('Erro ao iniciar timer');
      }
    } finally { setLoading(false); }
  };
  const pause = async () => {
    setLoading(true);
    try {
      console.debug('TimerModal: pause called, gameId=', game?.id);
      await axios.put(`/api/games/${game.id}/timer/pause`, {}, authCfg());
      await fetchState();
    } catch (e) {
      const status = e.response?.status;
      console.debug('TimerModal: pause error status=', status);
      if (status === 401) {
        toast.error('Sessão expirada. Faça login novamente.');
      } else if (status === 403) {
        toast.error('Apenas administradores podem pausar o timer');
      } else {
        toast.error(e.response?.data?.message || 'Erro ao pausar timer');
      }
    } finally { setLoading(false); }
  };
  const resume = async () => {
    setLoading(true);
    try {
      await unlockAudio();
      console.debug('TimerModal: resume called, gameId=', game?.id);
      await axios.put(`/api/games/${game.id}/timer/resume`, {}, authCfg());
      await fetchState();
      playBeep();
    } catch (e) {
      const status = e.response?.status;
      console.debug('TimerModal: resume error status=', status);
      if (status === 401) {
        toast.error('Sessão expirada. Faça login novamente.');
      } else if (status === 403) {
        toast.error('Apenas administradores podem retomar o timer');
      } else {
        toast.error(e.response?.data?.message || 'Erro ao retomar timer');
      }
    } finally { setLoading(false); }
  };
  const reset = async () => {
    setLoading(true);
    try {
      console.debug('TimerModal: reset called, gameId=', game?.id);
      await axios.put(`/api/games/${game.id}/timer/reset`, {}, authCfg());
      await fetchState();
    } catch (e) {
      const status = e.response?.status;
      console.debug('TimerModal: reset error status=', status);
      if (status === 401) {
        toast.error('Sessão expirada. Faça login novamente.');
      } else if (status === 403) {
        toast.error('Apenas administradores podem resetar o timer');
      } else {
        toast.error('Erro ao resetar timer');
      }
    } finally { setLoading(false); }
  };

  if (!isOpen || !game) return null;

  const remaining = state?.remaining_seconds || 0;
  const duration = state?.current?.duration_sec || 1;
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  const pct = Math.max(0, Math.min(100, 100 * (1 - remaining / duration)));
  const isAdmin = user?.role === 'admin';

  return (
    <div className="timer-overlay" onClick={onClose}>
      <div className="timer-modal" onClick={async (e) => { await unlockAudio(); e.stopPropagation(); }}>
        <div className="timer-header">
          <div className="timer-title"><Timer size={20} />&nbsp;Timer do Jogo</div>
          <button className="timer-close" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="timer-content">
          <div className="clock-panel">
            <div className="big-time">{mm}:{ss}</div>
            <div className="blinds-row">
              {state?.current?.level === 'break' ? (
                <div className="blind-item">Break</div>
              ) : (
                <>
                  <div className="blind-item">SB {state?.current?.sb || 0}</div>
                  <div className="blind-item">BB {state?.current?.bb || 0}</div>
                  <div className="blind-item">Ante {state?.current?.ante || 0}</div>
                </>
              )}
            </div>
          <div className="progress-bar"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
          </div>
          <div className="info-panel">
            <div className="level-row"><span>Nível Atual</span><span>{state?.current?.level || 1}</span></div>
            <div className="level-row"><span>Próximo</span><span>{state?.next?.level || '-'}</span></div>
            <div className="level-row"><span>Status</span><span>{state?.status || 'idle'}</span></div>
            <div className="control-row">
              <Link to={`/admin?tab=timer&gameId=${game.id}`} className="control-btn secondary"><Settings size={16} /> Configurar</Link>
              <button className="control-btn secondary" onClick={async () => { await unlockAudio(); setShowSound(v => !v); }}><Bell size={16} /> Som</button>
              {isAdmin && state?.status !== 'running' && (
                <button className="control-btn" onClick={start} disabled={loading || game?.status !== 'in_progress'}><Play size={16} /> Iniciar</button>
              )}
              {isAdmin && state?.status === 'running' && (
                <button className="control-btn secondary" onClick={pause} disabled={loading}><Pause size={16} /> Pausar</button>
              )}
              {isAdmin && state?.status === 'paused' && (
                <button className="control-btn" onClick={resume} disabled={loading}><Play size={16} /> Retomar</button>
              )}
              {isAdmin && (
                <button className="control-btn danger" onClick={reset} disabled={loading}><RotateCcw size={16} /> Reset</button>
              )}
            </div>
            {showSound && (
              <div style={{ marginTop: 12, background: '#1c1c1c', borderRadius: 8, padding: 12 }} onClick={async (e) => { await unlockAudio(); e.stopPropagation(); }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Bell />
                  <span>Alarme do Timer</span>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button onClick={() => { const v = !alarmEnabled; setAlarmEnabled(v); try { localStorage.setItem('poker_timer_alarm', v ? 'on' : 'off'); } catch (_) {} }} className="control-btn secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    {alarmEnabled ? <Bell size={16} /> : <BellOff size={16} />} {alarmEnabled ? 'Som ativado' : 'Som desativado'}
                  </button>
                  <select value={alarmPreset} onChange={(e) => { const t = e.target.value; setAlarmPreset(t); try { localStorage.setItem('poker_timer_alarm_preset', t); } catch (_) {} }} style={{ background: '#111', color: '#fff', borderRadius: 6, padding: '6px 8px' }}>
                    <option value="beep_short">Beep curto</option>
                    <option value="alarm_2s">Alarme 2s</option>
                    <option value="alarm_3s">Alarme 3s</option>
                    <option value="alarm_4s">Alarme 4s</option>
                    <option value="triple_beep">Triplo beep 1.9s</option>
                    <option value="sweep_up_3s">Sweep crescente 3s</option>
                    <option value="sweep_down_3s">Sweep decrescente 3s</option>
                    <option value="buzzer_2_5s">Buzzer ~2.5s</option>
                  </select>
                  <select value={alarmType} onChange={(e) => { const t = e.target.value; setAlarmType(t); try { localStorage.setItem('poker_timer_alarm_type', t); } catch (_) {} }} style={{ background: '#111', color: '#fff', borderRadius: 6, padding: '6px 8px' }}>
                    <option value="sine">Sine</option>
                    <option value="square">Square</option>
                    <option value="triangle">Triangle</option>
                    <option value="sawtooth">Saw</option>
                  </select>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span>Vol</span>
                    <input type="range" min={0} max={1} step={0.05} value={alarmVolume} onChange={(e) => { const v = parseFloat(e.target.value); setAlarmVolume(v); try { localStorage.setItem('poker_timer_alarm_vol', String(v)); } catch (_) {} }} />
                  </div>
                  <button onClick={playBeep} className="control-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Play size={16} /> Prévia
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TimerModal;
