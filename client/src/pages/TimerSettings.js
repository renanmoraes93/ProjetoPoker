import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Settings, Save, Plus, Trash2, Upload, Timer, Bell, BellOff, Play } from 'lucide-react';

function TimerSettings({ initialSelectedGameId = '' }) {
  const [presets, setPresets] = useState([]);
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);
  const [games, setGames] = useState([]);
  const [selectedGameId, setSelectedGameId] = useState('');
  const [loading, setLoading] = useState(false);
  const [alarmEnabled, setAlarmEnabled] = useState(() => {
    try { return localStorage.getItem('poker_timer_alarm') !== 'off'; } catch (_) { return true; }
  });
  const [alarmType, setAlarmType] = useState(() => {
    try { return localStorage.getItem('poker_timer_alarm_type') || 'sine'; } catch (_) { return 'sine'; }
  });
  const [alarmVolume, setAlarmVolume] = useState(() => {
    try { const v = parseFloat(localStorage.getItem('poker_timer_alarm_vol')); return isNaN(v) ? 0.2 : Math.max(0, Math.min(1, v)); } catch (_) { return 0.2; }
  });
  const [alarmPreset, setAlarmPreset] = useState(() => {
    try { return localStorage.getItem('poker_timer_alarm_preset') || 'beep_short'; } catch (_) { return 'beep_short'; }
  });
  const audioCtxRef = useRef(null);

  const fetchPresets = async () => {
    try {
      const t = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await axios.get('/api/club/timer/presets', t ? { headers: { Authorization: `Bearer ${t}` } } : {});
      const list = Array.isArray(res.data?.presets) ? res.data.presets : [];
      setPresets(list.length > 0 ? list : [{ name: 'Padrão', levels: [] }]);
      setSelectedPresetIndex(0);
    } catch (e) {
      const status = e.response?.status;
      if (status === 403) {
        toast.error('Acesso negado: apenas administradores podem gerenciar presets');
      } else if (status === 401) {
        toast.error('Sessão expirada. Faça login novamente.');
      } else {
        toast.error('Erro ao carregar presets');
      }
    }
  };

  const fetchGames = async () => {
    try {
      const t = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const cfg = t ? { headers: { Authorization: `Bearer ${t}` } } : {};
      const scheduled = await axios.get('/api/games?status=scheduled', cfg);
      const running = await axios.get('/api/games?status=in_progress', cfg);
      setGames([...(scheduled.data || []), ...(running.data || [])]);
    } catch (e) {
      const status = e.response?.status;
      if (status === 401) {
        toast.error('Sessão expirada. Faça login novamente.');
      } else {
        toast.error('Erro ao carregar jogos');
      }
    }
  };

  useEffect(() => {
    fetchPresets();
    fetchGames();
  }, []);

  useEffect(() => {
    if (initialSelectedGameId) {
      setSelectedGameId(String(initialSelectedGameId));
    }
  }, [initialSelectedGameId]);

  useEffect(() => {
    try {
      console.debug('TimerSettings: alarm panel state', { enabled: alarmEnabled, type: alarmType, volume: alarmVolume });
    } catch (_) {}
  }, [alarmEnabled, alarmType, alarmVolume]);

  const current = presets[selectedPresetIndex] || { name: '', levels: [] };

  const updateLevel = (idx, field, value) => {
    setPresets(prev => {
      const copy = [...prev];
      const levels = [...(copy[selectedPresetIndex]?.levels || [])];
      levels[idx] = { ...levels[idx], [field]: value };
      copy[selectedPresetIndex] = { ...copy[selectedPresetIndex], levels };
      return copy;
    });
  };

  const addLevel = () => {
    setPresets(prev => {
      const copy = [...prev];
      const levels = [...(copy[selectedPresetIndex]?.levels || [])];
      levels.push({ level: levels.length + 1, sb: 0, bb: 0, ante: 0, duration_sec: 600 });
      copy[selectedPresetIndex] = { ...copy[selectedPresetIndex], levels };
      return copy;
    });
  };

  const removeLevel = (idx) => {
    setPresets(prev => {
      const copy = [...prev];
      const levels = [...(copy[selectedPresetIndex]?.levels || [])];
      levels.splice(idx, 1);
      copy[selectedPresetIndex] = { ...copy[selectedPresetIndex], levels };
      return copy;
    });
  };

  const addPreset = () => {
    setPresets(prev => [...prev, { name: `Preset ${prev.length + 1}`, levels: [] }]);
    setSelectedPresetIndex(presets.length);
  };

  const updatePresetName = (name) => {
    setPresets(prev => {
      const copy = [...prev];
      copy[selectedPresetIndex] = { ...copy[selectedPresetIndex], name };
      return copy;
    });
  };

  const savePresets = async () => {
    setLoading(true);
    try {
      const t = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      await axios.put('/api/club/timer/presets', { presets }, t ? { headers: { Authorization: `Bearer ${t}` } } : {});
      toast.success('Presets salvos');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erro ao salvar presets');
    } finally {
      setLoading(false);
    }
  };

  const applyToGame = async () => {
    if (!selectedGameId) {
      toast.error('Selecione um jogo');
      return;
    }
    const levels = current.levels || [];
    if (levels.length === 0) {
      toast.error('Preset sem níveis');
      return;
    }
    setLoading(true);
    try {
      const t = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      await axios.put(`/api/games/${selectedGameId}/timer/schedule`, { schedule: levels }, t ? { headers: { Authorization: `Bearer ${t}` } } : {});
      toast.success('Preset aplicado ao jogo');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erro ao aplicar preset');
    } finally {
      setLoading(false);
    }
  };

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

  const playBeep = async () => {
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
  };

  return (
    <div className="page-container" style={{ padding: 20 }}>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Settings />
        <h2>Configuração de Timer</h2>
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <select value={selectedPresetIndex} onChange={(e) => setSelectedPresetIndex(parseInt(e.target.value) || 0)}>
              {presets.map((p, i) => (
                <option key={i} value={i}>{p.name || `Preset ${i + 1}`}</option>
              ))}
            </select>
            <button onClick={addPreset} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Plus size={16} />
              Novo Preset
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <input type="text" value={current.name || ''} onChange={(e) => updatePresetName(e.target.value)} placeholder="Nome do preset" />
            <button onClick={savePresets} disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Save size={16} />
              Salvar Presets
            </button>
          </div>

          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '60px 80px 80px 80px 120px 60px', gap: 8, fontWeight: 600, marginBottom: 8 }}>
              <span>Nível</span>
              <span>SB</span>
              <span>BB</span>
              <span>Ante</span>
              <span>Duração (s)</span>
              <span>Ações</span>
            </div>
            {(current.levels || []).map((lvl, idx) => (
              <div key={(typeof lvl.level !== 'undefined' ? String(lvl.level) : '') + '-' + idx} style={{ display: 'grid', gridTemplateColumns: '60px 80px 80px 80px 120px 60px', gap: 8, marginBottom: 6 }}>
                <input type="text" value={lvl.level} onChange={(e) => updateLevel(idx, 'level', e.target.value)} />
                <input type="number" value={lvl.sb || 0} onChange={(e) => updateLevel(idx, 'sb', parseInt(e.target.value) || 0)} />
                <input type="number" value={lvl.bb || 0} onChange={(e) => updateLevel(idx, 'bb', parseInt(e.target.value) || 0)} />
                <input type="number" value={lvl.ante || 0} onChange={(e) => updateLevel(idx, 'ante', parseInt(e.target.value) || 0)} />
                <input type="number" value={lvl.duration_sec || 0} onChange={(e) => updateLevel(idx, 'duration_sec', parseInt(e.target.value) || 0)} />
                <button onClick={() => removeLevel(idx)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button onClick={addLevel} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <Plus size={16} />
              Adicionar Nível
            </button>
          </div>

        </div>

        <div style={{ width: 360 }}>
          <div style={{ marginTop: 0, background: '#0f0f0f', color: '#fff', borderRadius: 10, padding: 16 }} onClick={unlockAudio}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Bell />
              <h3>Alarme do Timer</h3>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => { const v = !alarmEnabled; setAlarmEnabled(v); try { localStorage.setItem('poker_timer_alarm', v ? 'on' : 'off'); } catch (_) {} }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {alarmEnabled ? <Bell size={16} /> : <BellOff size={16} />} {alarmEnabled ? 'Som ativado' : 'Som desativado'}
              </button>
              <select value={alarmPreset} onChange={(e) => { const t = e.target.value; setAlarmPreset(t); try { localStorage.setItem('poker_timer_alarm_preset', t); } catch (_) {} }}>
                <option value="beep_short">Beep curto</option>
                <option value="alarm_2s">Alarme 2s</option>
                <option value="alarm_3s">Alarme 3s</option>
                <option value="alarm_4s">Alarme 4s</option>
                <option value="triple_beep">Triplo beep 1.9s</option>
                <option value="sweep_up_3s">Sweep crescente 3s</option>
                <option value="sweep_down_3s">Sweep decrescente 3s</option>
                <option value="buzzer_2_5s">Buzzer ~2.5s</option>
              </select>
              <select value={alarmType} onChange={(e) => { const t = e.target.value; setAlarmType(t); try { localStorage.setItem('poker_timer_alarm_type', t); } catch (_) {} }}>
                <option value="sine">Sine</option>
                <option value="square">Square</option>
                <option value="triangle">Triangle</option>
                <option value="sawtooth">Saw</option>
              </select>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span>Vol</span>
                <input type="range" min={0} max={1} step={0.05} value={alarmVolume} onChange={(e) => { const v = parseFloat(e.target.value); setAlarmVolume(v); try { localStorage.setItem('poker_timer_alarm_vol', String(v)); } catch (_) {} }} />
              </div>
              <button onClick={playBeep} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Play size={16} /> Prévia
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '16px 0 12px' }}>
            <Timer />
            <h3>Aplicar Preset a um Jogo</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <select value={selectedGameId} onChange={(e) => setSelectedGameId(e.target.value)}>
              <option value="">Selecione um jogo</option>
              {games.map((g) => (
                <option key={g.id} value={g.id}>{g.name} ({g.status})</option>
              ))}
            </select>
            <button onClick={applyToGame} disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Upload size={16} />
              Aplicar ao Jogo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TimerSettings;
