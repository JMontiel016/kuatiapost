"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/** Campo compartido: los secretos se pueden mostrar sin modificar su valor. */
export default function CampoTexto({ label, value, onChange, type = "text", placeholder = "", maxLength, soloDigitos = false }: any) {
  const [visible, setVisible] = useState(false);
  const secreto = type === "password";
  return <label className="field">
    <span>{label}</span>
    <div className="campo-con-ojo">
      <input type={secreto && visible ? "text" : type} value={value}
        maxLength={maxLength} inputMode={soloDigitos ? "numeric" : undefined}
        onChange={(e) => {
          const texto = soloDigitos ? e.target.value.replace(/\D/g, "") : e.target.value;
          onChange(maxLength ? texto.slice(0, maxLength) : texto);
        }} placeholder={placeholder} autoComplete="off" />
      {secreto && <button type="button" className="outline" aria-label={visible ? "Ocultar valor" : "Mostrar valor"} aria-pressed={visible} onClick={() => setVisible(!visible)}>
        {visible ? <EyeOff size={18}/> : <Eye size={18}/>}
      </button>}
    </div>
  </label>;
}
