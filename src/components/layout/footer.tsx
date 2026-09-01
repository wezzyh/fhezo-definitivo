export function Footer() {
  const anoAtual = new Date().getFullYear();

  return (
    <footer className="border-t border-zinc-200 bg-zinc-50">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-zinc-600">
        <p>&copy; {anoAtual} FHEZO Industrial. Todos os direitos reservados.</p>
        <p className="mt-1">
          Rolamentos, engrenagens, correntes, graxas, ferramentas, parafusos e porcas especiais.
        </p>
      </div>
    </footer>
  );
}
