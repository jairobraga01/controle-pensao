"use client";

import { useEffect, useRef, useState } from "react";
import { criarClienteNavegador } from "@/lib/supabase/client";

const TIPOS = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const LIMITE = 10 * 1024 * 1024;

interface Enviado { caminho: string; nome: string }

/**
 * Envia o comprovante do navegador direto para o armazenamento. O formulário
 * leva só o caminho do arquivo: a Vercel recusa envios acima de 4,5 MB.
 */
export function CampoComprovante({ processoId, apenasPdf = false, multiplo = true, obrigatorio = true }: {
  processoId: string;
  obrigatorio?: boolean;
  apenasPdf?: boolean;
  multiplo?: boolean;
}) {
  const [enviados, setEnviados] = useState<Enviado[]>([]);
  const [enviando, setEnviando] = useState(0);
  const [erro, setErro] = useState<string | null>(null);

  // Impede salvar sem comprovante ou com envio em andamento.
  const trava = useRef<HTMLInputElement>(null);
  useEffect(() => {
    trava.current?.setCustomValidity(
      enviando > 0 ? "Aguarde o envio do comprovante." : obrigatorio && enviados.length === 0 ? "Anexe o comprovante." : "",
    );
  }, [enviando, enviados.length, obrigatorio]);

  async function escolher(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivos = Array.from(e.target.files ?? []);
    e.target.value = "";
    setErro(null);
    const supabase = criarClienteNavegador();
    for (const a of arquivos) {
      const aceitos = apenasPdf ? ["application/pdf"] : TIPOS;
      if (!aceitos.includes(a.type)) { setErro(`Formato não aceito: ${a.name}. Use ${apenasPdf ? "PDF" : "PDF, JPG ou PNG"}.`); continue; }
      if (a.size > LIMITE) { setErro(`${a.name} passa de 10 MB.`); continue; }
      setEnviando((n) => n + 1);
      const seguro = a.name.normalize("NFD").replace(/[^\w.-]+/g, "_").slice(-80);
      const caminho = `${processoId}/${crypto.randomUUID()}-${seguro}`;
      const { error } = await supabase.storage.from("comprovantes").upload(caminho, a, { contentType: a.type });
      setEnviando((n) => n - 1);
      if (error) { setErro(`Falha ao enviar ${a.name}: ${error.message}`); continue; }
      setEnviados((l) => (multiplo ? [...l, { caminho, nome: a.name }] : [{ caminho, nome: a.name }]));
    }
  }

  return (
    <div className="comprovante">
      <input type="file" accept={apenasPdf ? "application/pdf" : "application/pdf,image/*"} multiple={multiplo} onChange={escolher} />
      {enviados.map((a) => (
        <div key={a.caminho} className="linha suave">
          <span>✓ {a.nome}</span>
          <button type="button" className="link" onClick={() => setEnviados((l) => l.filter((x) => x.caminho !== a.caminho))}>remover</button>
          <input type="hidden" name="comprovante_caminho" value={a.caminho} />
          <input type="hidden" name="comprovante_nome" value={a.nome} />
        </div>
      ))}
      {enviando > 0 && <p className="dica">Enviando comprovante…</p>}
      {erro && <p className="erro">{erro}</p>}
      {/* readOnly desligaria a validação; o valor fica sempre vazio. */}
      <input ref={trava} className="trava" tabIndex={-1} aria-hidden value="" onChange={() => {}} />
    </div>
  );
}
