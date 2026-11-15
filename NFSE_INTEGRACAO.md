# Integracao NFS-e Nacional

Em Faturas, use Emitir NFS-e, revise os dados e confirme o envio. Nenhuma nota foi transmitida durante a implantacao. A validacao real depende do certificado A1 e da habilitacao da empresa no emissor nacional.

Em Configuracoes > NFS-e e certificado digital, confira CNPJ, inscricao municipal e os enquadramentos com a contabilidade. Os padroes sao Valparaiso/SP (3556305), Simples Nacional com tributos federais e municipais no regime, tributacao 150307 e NBS 111011100. Os codigos informados precisam corresponder ao servico efetivamente prestado. Use uma serie exclusiva e seu primeiro numero livre. Complete os campos fiscais pendentes; nao foram presumidas aliquotas.

O ambiente inicial e homologacao. Cadastre o arquivo A1 .pfx/.p12 e sua senha diretamente no sistema com usuario administrador. Financeiro pode revisar, emitir e consultar; a configuracao e o certificado exigem administrador. Execute primeiro uma emissao de homologacao, confira o retorno e somente depois altere para producao.

O cadastro do cliente precisa ter CPF/CNPJ e endereco completos. A revisao solicita competencia e codigo IBGE do municipio do cliente. Notas autorizadas permitem baixar o XML. Pagamento continua independente da emissao. Dados fiscais de faturas com envio pendente ou autorizado nao podem ser alterados ou excluidos.

Se houver timeout, consulte a mesma tentativa. O sistema preserva DPS e numeracao; reenvio da mesma DPS somente fica disponivel quando a consulta da API informa que ela nao existe. Nao ha cancelamento ou substituicao implementados nesta entrega.

## Operacao tecnica

Instale dependencias com npm install e Python com lxml (python -m pip install lxml). Execute npm run nfse:setup para gerar NFSE_ENCRYPTION_KEY no .env; preserve uma copia segura dessa chave junto ao backup do banco. A perda da chave exige novo cadastro do certificado. NFSE_PYTHON pode indicar o executavel Python. Reinicie o servidor apos instalar ou alterar o ambiente.

Certificado e senha sao cifrados com AES-256-GCM no servidor. A chave permanece fora do banco. O certificado e conferido quanto a chave privada, CNPJ e validade; a aceitacao pela autoridade e a situacao fiscal dependem da API. Nao exponha o servidor sem HTTPS fora do ambiente local.

Os dados da integracao usam a tabela configuracoes existente. A classificacao Receita/Despesa tambem tem compatibilidade com bancos sem coluna natureza, sem exigir permissao ALTER TABLE.

O XML assinado e validado pelos XSD oficiais antes do envio. O validador adapta em memoria as ancoras ^/$ do padrao de serie para a semantica XML Schema do libxml; os XSD originais permanecem intactos. O escopo fiscal contempla tomadores nacionais e os enquadramentos expostos na configuracao; cenarios especiais precisam de adequacao especifica.

Validacao: node --test --test-reporter=dot; node scripts/check-nfse-ui.js. O teste de interface usa API simulada e nao transmite documentos.

Fontes oficiais:
- https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual/documentacao-atual
- https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/apis-prod-restrita-e-producao
- https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual/manual-contribuintes-emissor-publico-api-sistema-nacional-nfs-e-v1-2-out2025.pdf

## Configuracao fiscal

Cadastre os dados da empresa em Configuracoes. Os parametros fiscais e o certificado A1 sao privados e dependem da instalacao. Nao existem dados fiscais de clientes ou da empresa predefinidos neste documento.

A emissao depende da configuracao do ambiente fiscal e da validacao dos dados informados. O sistema verifica os documentos contra os XSD oficiais antes do envio.

## Consulta e cancelamento

A consulta de uma nota autorizada verifica eventos de cancelamento, validando chave, tipo e XML. Documentos cancelados nao sao reenviados. Falhas na consulta preservam o estado conhecido e indicam que a sincronizacao nao foi concluida.

Quando o servico DANFSe nao estiver disponivel, o PDF de consulta local e identificado como consulta e nao substitui o documento oficial. Documentos fiscais, XMLs e PDFs de uma instalacao devem permanecer fora do repositorio.
