import React from 'react';
import '../styles/auth.css';


export default function BusControls({ onStart, onHonk, onGear, isStarted }) {
return (
<div className="bus-controls">
<div className="controls-row">
<button className={`control-btn ${isStarted ? 'active' : ''}`} onClick={onStart}>
{isStarted ? 'Engine On' : 'Start Engine'}
</button>
<button className="control-btn" onClick={onHonk}>Horn 🔊</button>
<div className="gear-group">
<label>Gear</label>
<select className="gear-select" onChange={(e) => onGear(e.target.value)}>
<option value="P">P</option>
<option value="R">R</option>
<option value="N">N</option>
<option value="D">D</option>
</select>
</div>
</div>
</div>
);
}