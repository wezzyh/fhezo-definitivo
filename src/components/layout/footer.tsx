export function Footer() {
  const anoAtual = new Date().getFullYear();

  return (
    <footer className="bg-dark">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-zinc-400">
        <p>&copy; {anoAtual} FHEZO Industrial. Todos os direitos reservados.</p>
        <p className="mt-1">
          Rolamentos, engrenagens, correntes, graxas, ferramentas, parafusos e porcas especiais.
        </p>
      </div>
    </footer>
  );
}
