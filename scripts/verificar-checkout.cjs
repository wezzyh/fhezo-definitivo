/* Verificação do checkout com respostas controladas, sem gravar clientes ou pedidos.
 * Requer navegador iniciado pelo agent-browser (CDP_URL) e PLAYWRIGHT_MODULE.
 * Uso: node scripts/verificar-checkout.cjs
 */
const fs = require("fs"),
  path = require("path"),
  assert = require("node:assert/strict");
const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE || "playwright-core",
);
const saida = path.resolve("artifacts/checkout");
const buildId = process.env.BASE_URL
  ? fs.readFileSync(".next/BUILD_ID", "utf8").trim()
  : "development";
fs.mkdirSync(saida, { recursive: true });
const items = Array.from({ length: 7 }, (_, i) => ({
  produtoId: "11111111-1111-4111-8111-" + String(i + 1).padStart(12, "0"),
  nome:
    i === 0
      ? "Mancal com rolamento autocompensador industrial para conjunto de transmissão e suporte reforçado de operação contínua"
      : i === 6
        ? "Conjunto de transmissão industrial " +
          "REFERENCIASEMESPACOS".repeat(9)
        : "Rolamento industrial de precisão " + (i + 1),
  sku: i === 6 ? "SKU".repeat(32) : "UCP-20" + i,
  preco: i === 6 ? 12345.67 : 100.25 + i * 12.3,
  quantidade: (i % 3) + 1,
  estoque: i === 0 ? 2 : 20,
  pesoKg: 1,
  alturaCm: 10,
  larguraCm: 10,
  comprimentoCm: 10,
}));
const cliente = {
  id: "33333333-3333-4333-8333-333333333333",
  tipo: "PF",
  nome: "Cliente de teste do checkout",
  documento: "52998224725",
  email: "checkout@example.com",
  telefone: "11999999999",
  endereco_cep: "01310100",
  endereco_rua: "Avenida Paulista",
  endereco_numero: "1000",
  endereco_complemento: "Sala 7",
  endereco_bairro: "Bela Vista",
  endereco_cidade: "São Paulo",
  endereco_uf: "SP",
};
let autenticado = true,
  metodo = "pix",
  pagarFalha = true,
  chamadasPagamento = 0;
const resultados = [],
  errors = [];
(async () => {
  const browser = await chromium.connectOverCDP(process.env.CDP_URL);
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    bypassCSP: false,
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().includes("Content Security Policy"))
      errors.push(m.text().slice(0, 500));
  });
  await page.route("**/*", async (route) => {
    const req = route.request();
    if (
      req.method() === "GET" &&
      req.isNavigationRequest() &&
      new URL(req.url()).pathname.startsWith("/checkout")
    ) {
      const response = await route.fetch();
      const html = (await response.text()).replace(
        "</head>",
        "<script>window.__testeCspCartao=true</script></head>",
      );
      return route.fulfill({ response, body: html });
    }
    if (req.method() !== "POST" || !req.headers()["next-action"])
      return route.continue();
    let payload;
    try {
      payload = JSON.parse(req.postData());
    } catch {
      throw new Error(
        "Ação não reconhecida; teste bloqueado antes de escrever dados.",
      );
    }
    let result;
    if (Array.isArray(payload[0])) {
      result = {
        sucesso: true,
        itens: payload[0].map((i) => ({
          ...items.find((p) => p.produtoId === i.produtoId),
          quantidade: i.quantidade,
        })),
      };
    } else if (typeof payload[0] === "string" && Array.isArray(payload[1])) {
      result = {
        sucesso: true,
        opcoes: [
          {
            id: 3,
            nome: ".Package",
            transportadora: "Jadlog",
            prazoDias: 5,
            valor: 19.93,
          },
          {
            id: 4,
            nome: ".Com",
            transportadora: "Jadlog",
            prazoDias: 4,
            valor: 15.98,
          },
        ],
      };
    } else if (payload.length === 0) {
      result = autenticado
        ? { sucesso: true, cliente, clienteId: cliente.id }
        : {
            sucesso: false,
            login: true,
            mensagem: "Crie sua conta ou entre para continuar o pedido.",
          };
    } else if (payload[0]?.itens) {
      chamadasPagamento++;
      metodo = payload[0].formaPagamento;
      if (metodo === "cartao") {
        assert.equal(payload[0].cartao.numero, "4111111111111111");
        assert.equal(payload[0].cartao.cvv, "321");
      } else assert(!payload[0].cartao && !payload[0].titularCartao);
      result = pagarFalha
        ? {
            sucesso: false,
            mensagem: "Pagamento indisponível — resposta controlada de teste.",
          }
        : {
            sucesso: true,
            pedidoId: "44444444-4444-4444-8444-444444444444",
            numeroPedido: "44444444",
            status: "pendente",
            formaPagamento: metodo,
          };
    } else if (typeof payload[0] === "string") {
      result = {
        sucesso: true,
        numeroPedido: "44444444",
        status: "pendente",
        formaPagamento: metodo,
        total: items.reduce((n, i) => n + i.preco * i.quantidade, 19.93),
        freteValor: 19.93,
        freteTransportadora: "Jadlog",
        itens: items.map((i) => ({
          nome: i.nome,
          quantidade: i.quantidade,
          preco: i.preco,
        })),
        aviso: "Estado pendente controlado para teste de interface.",
      };
    } else throw new Error("Ação desconhecida bloqueada");
    await route.fulfill({
      status: 200,
      contentType: "text/x-component",
      body:
        "0:" +
        JSON.stringify({ a: "$@1", f: "", q: "", i: true, b: buildId }) +
        "\n1:" +
        JSON.stringify(result) +
        "\n",
    });
  });
  const documento = await page.goto(
    (process.env.BASE_URL || "http://localhost:3000") + "/checkout",
  );
  assert(documento.headers()["content-security-policy"].includes("'nonce-"));
  assert(/no-store|no-cache/.test(documento.headers()["cache-control"]));
  await page
    .getByRole("heading", { name: "Seu carrinho está vazio." })
    .waitFor();
  await page.evaluate((itens) => {
    localStorage.setItem("fhezo:carrinho", JSON.stringify(itens));
    sessionStorage.removeItem("fhezo:checkout:v1");
  }, items);
  await page.reload();
  await page
    .waitForFunction(
      () =>
        document.querySelectorAll(".product-table tbody tr").length === 7 &&
        !document.querySelector(".checkout-button")?.disabled,
    )
    .catch(async () => {
      throw new Error(
        "Carrinho não ficou pronto: " +
          (await page.locator("body").innerText()).slice(0, 3000) +
          " | " +
          errors.join(";"),
      );
    });
  assert.equal(await page.locator(".product-table tbody tr").count(), 7);
  for (const width of [1440, 901, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "Overflow no carrinho " + width,
    );
    const rows = await page
      .locator(".product-table tbody tr")
      .evaluateAll((rows) =>
        rows.map((r) => ({
          top: r.getBoundingClientRect().top,
          bottom: r.getBoundingClientRect().bottom,
        })),
      );
    assert(
      rows.every((r, i) => !i || r.top >= rows[i - 1].bottom - 1),
      "Linhas se sobrepõem",
    );
    await page.screenshot({
      path: path.join(saida, "carrinho-" + width + ".png"),
      fullPage: true,
    });
  }
  resultados.push(
    "Sete produtos, nomes/SKUs longos e sem overflow: 1440, 901, 768, 390 e 320 px.",
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  const primeira = page.locator(".product-table tbody tr").first();
  await primeira.getByRole("button", { name: /Aumentar/ }).click();
  await page.waitForFunction(
    () =>
      document.querySelector(".quantity-control output").textContent === "2",
  );
  assert(await primeira.getByRole("button", { name: /Aumentar/ }).isDisabled());
  assert.equal(
    await page
      .locator(".product-table tbody tr")
      .nth(1)
      .locator("output")
      .textContent(),
    "2",
  );
  await primeira.getByRole("button", { name: /Remover/ }).click();
  assert.equal(await page.locator(".product-table tbody tr").count(), 6);
  await page.getByRole("button", { name: "Desfazer", exact: true }).click();
  assert.equal(await page.locator(".product-table tbody tr").count(), 7);
  await page.getByRole("button", { name: "Limpar carrinho" }).click();
  await page
    .getByRole("heading", { name: "Seu carrinho está vazio." })
    .waitFor();
  await page.getByRole("button", { name: "Desfazer remoção" }).click();
  assert.equal(await page.locator(".product-table tbody tr").count(), 7);
  resultados.push(
    "Quantidade individual, limite de estoque, remoção, limpeza e desfazer.",
  );
  await page.locator("#shipping-cep").fill("00000000");
  await page.getByRole("button", { name: "Calcular", exact: true }).click();
  await page.locator("main [role=alert]").first().waitFor();
  await page.locator("#shipping-cep").fill("01310100");
  await page.locator('input[name="frete"]').first().check();
  await page.getByRole("button", { name: "Continuar pedido" }).click();
  await page.waitForURL("**/checkout/identificacao");
  await page.getByRole("heading", { name: "Dados do cadastro" }).waitFor();
  assert.equal(
    await page.getByRole("button", { name: "Pessoa Física" }).count(),
    0,
  );
  assert(
    (await page.locator(".identity-details").innerText()).includes(
      cliente.nome,
    ),
  );
  for (const width of [1440, 901, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "Overflow identificação " + width,
    );
    await page.screenshot({
      path: path.join(saida, "identificacao-" + width + ".png"),
      fullPage: true,
    });
  }
  await page.locator("#numero").fill("702");
  await page.locator("#complemento").fill("Galpão B");
  await page.getByRole("button", { name: "Continuar para pagamento" }).click();
  await page.waitForURL("**/checkout/pagamento");
  await page.getByRole("heading", { name: "Forma de pagamento" }).waitFor();
  for (const width of [1440, 901, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "Overflow pagamento " + width,
    );
    await page.screenshot({
      path: path.join(saida, "pagamento-" + width + ".png"),
      fullPage: true,
    });
  }
  await page.getByRole("radio", { name: "Cartão de crédito" }).check();
  await page.locator("#numeroCartao").waitFor();
  for (const width of [1440, 901, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "Overflow cartão " + width,
    );
    await page.screenshot({
      path: path.join(saida, "cartao-" + width + ".png"),
      fullPage: true,
    });
  }
  await page.locator("#numeroCartao").focus();
  const estiloCampo = await page.locator("#numeroCartao").evaluate((e) => {
    const s = getComputedStyle(e);
    return {
      raio: s.borderRadius,
      offset: s.outlineOffset,
      cor: s.outlineColor,
    };
  });
  assert.deepEqual(estiloCampo, {
    raio: "5px",
    offset: "-2px",
    cor: "rgb(0, 155, 108)",
  });
  assert.equal(
    await page
      .locator(".checkout-button")
      .evaluate((e) => getComputedStyle(e).backgroundColor),
    "rgb(0, 155, 108)",
  );
  await page.locator("#numeroCartao").fill("4111111111111111");
  await page.locator("#cvv").fill("321");
  assert(
    await page.evaluate(
      () =>
        !JSON.stringify({
          local: { ...localStorage },
          session: { ...sessionStorage },
        })
          .replace(/ /g, "")
          .includes("4111111111111111"),
    ),
    "Cartão apareceu no armazenamento",
  );
  await page.reload();
  await page.getByRole("heading", { name: "Forma de pagamento" }).waitFor();
  assert(
    await page.getByRole("radio", { name: "Cartão de crédito" }).isChecked(),
  );
  assert(
    (await page.locator(".review-details").allInnerTexts())
      .join(" ")
      .includes("702"),
  );
  assert.equal(await page.locator("#numeroCartao").inputValue(), "");
  assert.equal(await page.locator("#cvv").inputValue(), "");
  await page.getByRole("link", { name: "Voltar à identificação" }).click();
  await page.locator("#numero").waitFor();
  assert.equal(await page.locator("#numero").inputValue(), "702");
  assert.equal(await page.locator("#complemento").inputValue(), "Galpão B");
  await page
    .getByRole("link", { name: "Voltar ao carrinho", exact: true })
    .click();
  await page.locator("#shipping-cep").waitFor();
  assert.equal(await page.locator("#shipping-cep").inputValue(), "01310-100");
  await page.getByRole("button", { name: "Continuar pedido" }).click();
  await page.getByRole("button", { name: "Continuar para pagamento" }).click();
  await page.waitForURL("**/checkout/pagamento");
  resultados.push(
    "Carrinho → identificação da conta → pagamento; voltar e recarregar preservam endereço, CEP, frete e método.",
  );
  // Entra por navegação SPA iniciada em documento sem CSP de checkout.
  await page.goto(
    (process.env.BASE_URL || "http://localhost:3000") + "/produtos",
  );
  await page.getByRole("button", { name: "Abrir carrinho" }).click();
  await page.locator('a[href="/checkout"]').click();
  await page.getByRole("button", { name: "Continuar pedido" }).click();
  await page.getByRole("button", { name: "Continuar para pagamento" }).click();
  await page.locator("#numeroCartao").waitFor();
  assert(
    await page.evaluate(() =>
      new URL(
        performance.getEntriesByType("navigation")[0].name,
      ).pathname.startsWith("/checkout"),
    ),
    "Documento de pagamento precisa recarregar para aplicar CSP",
  );
  const executouInline = await page.evaluate(
    () => window.__testeCspCartao === true,
  );
  assert.equal(
    executouInline,
    false,
    "Script injetado sem nonce deve ser bloqueado",
  );
  resultados.push(
    "Entrada pelo catálogo recarrega o documento antes de coletar cartão; CSP bloqueia script inline sem nonce.",
  );
  await page.getByRole("button", { name: /Finalizar pedido/ }).click();
  await page.getByRole("alert").filter({ hasText: "Confira número" }).waitFor();
  assert.equal(
    chamadasPagamento,
    0,
    "Dados inválidos não podem chamar a action",
  );
  await page.locator("#numeroCartao").fill("4111111111111111");
  await page.locator("#nomeImpresso").fill("CLIENTE TESTE");
  await page.locator("#validadeCartao").fill("1235");
  await page.locator("#cvv").fill("321");
  await page.getByRole("button", { name: /Finalizar pedido/ }).click();
  await page.locator("main [role=alert]").first().waitFor();
  assert(
    (await page.locator("main [role=alert]").first().innerText()).includes(
      "indisponível",
    ),
  );
  assert.equal(chamadasPagamento, 1);
  assert.equal(await page.locator("#numeroCartao").inputValue(), "");
  assert.equal(await page.locator("#cvv").inputValue(), "");
  assert(
    await page.evaluate(
      () =>
        !JSON.stringify({
          local: { ...localStorage },
          session: { ...sessionStorage },
        })
          .replace(/ /g, "")
          .includes("4111111111111111"),
    ),
  );
  resultados.push(
    "Cartão no site: validação antes de enviar; PAN/CVV ausentes do armazenamento e limpos após envio/reload; layout entre 320 e 1440 px.",
  );
  pagarFalha = false;
  await page.getByRole("radio", { name: "Pix", exact: true }).check();
  await page.getByRole("button", { name: /Finalizar pedido/ }).click();
  await page.waitForURL("**/checkout/confirmacao?pedido=*");
  await page
    .getByRole("heading", { name: "Pedido registrado", exact: true })
    .waitFor();
  assert.equal(
    await page
      .getByRole("heading", { name: "Pagamento confirmado", exact: true })
      .count(),
    0,
  );
  await page.reload();
  await page
    .getByRole("heading", { name: "Pedido registrado", exact: true })
    .waitFor();
  resultados.push(
    "Respostas controladas: erro de pagamento mantém o fluxo; pedido pendente nunca é exibido como pago e sobrevive ao reload.",
  );
  autenticado = false;
  await page.goto(
    (process.env.BASE_URL || "http://localhost:3000") + "/checkout",
  );
  await page.evaluate((itens) => {
    localStorage.setItem("fhezo:carrinho", JSON.stringify(itens));
    sessionStorage.removeItem("fhezo:checkout:v1");
  }, items);
  await page.addInitScript((itens) => {
    if (!sessionStorage.getItem("fixture-visitante")) {
      localStorage.setItem("fhezo:carrinho", JSON.stringify(itens));
      sessionStorage.removeItem("fhezo:checkout:v1");
      sessionStorage.setItem("fixture-visitante", "1");
    }
  }, items);
  await page.reload();
  await page.getByRole("button", { name: "Continuar pedido" }).click();
  await page
    .getByRole("heading", { name: "Identifique-se para continuar" })
    .waitFor();
  assert.equal(
    await page
      .getByRole("link", { name: "Criar minha conta" })
      .getAttribute("href"),
    "/cadastro?proximo=%2Fcheckout%2Fidentificacao",
  );
  resultados.push(
    "Visitante precisa criar conta ou entrar e recebe retorno para identificação.",
  );
  assert.equal(errors.length, 0, errors.join("\n"));
  fs.writeFileSync(
    path.join(saida, "resultados.json"),
    JSON.stringify(
      {
        tipo: "Testes de interface com respostas controladas; sem compra real.",
        resultados,
        errors,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ resultados, errors }, null, 2));
  await context.close();
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
