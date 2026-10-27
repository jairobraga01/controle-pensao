"use client";

/** Em vez da tela branca do Next, mostra o erro e um botão para recarregar. */
export default function Erro({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // Depois de uma publicação nova, a página aberta pode pedir arquivos antigos; recarregar resolve.
  const versaoAntiga = /ChunkLoadError|Loading chunk|dynamically imported module|Failed to fetch/i.test(error.message);
  return (
    <div className="app">
      <main className="conteudo" style={{ paddingTop: 40 }}>
        <section className="cartao">
          <h2>Algo deu errado nesta tela</h2>
          <p className="dica">
            {versaoAntiga
              ? "O app foi atualizado enquanto a página estava aberta. Recarregue para usar a versão nova."
              : "Tente recarregar. Se continuar, envie um print desta mensagem."}
          </p>
          <p className="dica" style={{ fontFamily: "monospace", wordBreak: "break-word" }}>
            {error.message}
            {error.digest ? ` (código ${error.digest})` : ""}
          </p>
          <button className="botao" onClick={() => window.location.reload()}>Recarregar</button>
          <button className="botao contorno" onClick={() => reset()}>Tentar de novo sem recarregar</button>
        </section>
      </main>
    </div>
  );
}
