"use client";

import { useState } from "react";
import { Eye, EyeOff, KeyRound, Send, Trash2 } from "lucide-react";
import Field from "../formularios/CampoTexto";

/** Configura la conexión y el token compartido por todos los envíos y consultas. */
export default function ConfiguracionIntegracion({
  authJson, editarAuthJson, authError,
  authUrl,
  setAuthUrl,
  ruc,
  setRuc,
  password,
  setPassword,
  busy,
  authenticate,
  token,
  setToken,
  url,
  setUrl,
  setNotice,
  consultaUrl, setConsultaUrl, kudeUrl, setKudeUrl, compartirKude, setCompartirKude,
}: any) {
  // El JSON contiene credenciales: no se monta hasta que el usuario lo revele.
  // Ocultarlo conserva el texto real y la sincronización con los campos.
  const [verJson, cambiarVerJson] = useState(false);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">CONEXIÓN DE KUATIAPOST</div>
          <h1>Configuración</h1>
          <p>
            Ingresá las direcciones de tu servicio y generá el token de acceso.
          </p>
        </div>
      </div>
      <div className="settings-grid ajustes-conexion">
        <section className="panel settings-panel">
          <h3>
            <Send size={20} />
            Servicio de datos
          </h3>
          <Field
            label="URL para enviar datos"
            value={url}
            onChange={setUrl}
            placeholder="https://tu-dominio.com/api/operation"
          />
          <Field label="URL para consultar datos" value={consultaUrl} onChange={setConsultaUrl} placeholder="https://tu-dominio.com/api/consulta" />
          <label className="checkbox"><input type="checkbox" checked={compartirKude} onChange={(e) => setCompartirKude(e.target.checked)} />Usar la URL de consulta para el KUDE</label>
          {!compartirKude && <Field label="URL para obtener el KUDE en base64" value={kudeUrl} onChange={setKudeUrl} placeholder="https://tu-dominio.com/api/kude" />}
          <p>Cada operación utiliza su dirección y el mismo token de acceso.</p>
        </section>
        <section className="panel settings-panel">
          <h3>
            <KeyRound size={20} />
            Token de acceso
          </h3>
          <Field
            label="URL para generar el token"
            value={authUrl}
            onChange={setAuthUrl}
            placeholder="https://tu-dominio.com/api/autenticate"
          />
          <div className="two-fields">
            <Field
              label="Usuario"
              value={ruc}
              onChange={setRuc}
            />
            <Field
              label="Contraseña"
              type="password"
              value={password}
              onChange={setPassword}
            />
          </div>
          <div className="auth-json-controles">
            <span>JSON de autenticación</span>
            <button type="button" className="outline" aria-expanded={verJson}
              onClick={() => cambiarVerJson(!verJson)}>
              {verJson ? <EyeOff size={16} /> : <Eye size={16} />}
              {verJson ? "Ocultar JSON" : "Ver y editar JSON"}
            </button>
          </div>
          {verJson ? (
            <label className="field">
              <span>Los cambios se reflejan en Usuario y Contraseña.</span>
              <textarea className="auth-json-editable" value={authJson}
                onChange={(e) => editarAuthJson(e.target.value)}
                aria-label="JSON editable de autenticación" aria-invalid={!!authError}
                spellCheck={false} />
            </label>
          ) : <p className="tiny">JSON oculto para proteger las credenciales.</p>}
          {authError && <small role="alert">{authError}</small>}
          <button className="primary" disabled={busy} onClick={authenticate}>
            <KeyRound size={16} />
            {busy ? "Generando…" : "Generar token"}
          </button>
          <Field
            label="Token generado o ingresado manualmente"
            value={token}
            onChange={setToken}
            type="password"
          />
          <p>
            El token se agrega automáticamente a todos los envíos y consultas.
            Podés reemplazarlo en este campo.
          </p>
          <button
            className="outline"
            disabled={!token}
            onClick={() => {
              setToken("");
              setNotice("Token eliminado.");
            }}
          >
            <Trash2 size={16} />
            Eliminar token
          </button>
        </section>
      </div>
      <p className="tiny">
        Cambiar de pantalla conserva los datos. Recargar o cerrar KuatiaPost
        termina esta sesión.
      </p>
    </>
  );
}
