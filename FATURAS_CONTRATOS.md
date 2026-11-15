# Faturas e contratos

## Faturas
Novas faturas recebem numeração automática a partir de 3000, com sequência persistida no MySQL. Números antigos são preservados.
A ficha do veículo soma todas as faturas vinculadas e separa emitido, recebido e a receber. A recuperação do investimento considera o recebido. Valores adicionais de uma fatura com vários veículos são divididos igualmente, preservando os centavos.
Para registrar pagamento, abra a ação da fatura, informe a data no próprio formulário e confirme.

## Contratos
Cadastre o contrato, abra sua ficha e selecione “Revisar texto e gerar contrato”. O modelo enviado é preenchido com dados da empresa, cliente, veículos, valores, período e observações. Dados ausentes aparecem como “Não informado”.
Selecione checklists dos veículos contratados e revise o texto. Horários, forma de pagamento e assinaturas adicionais podem ser informados na seção de complementos; use “Preencher novamente com os dados” para aplicá-los ao texto, substituindo a edição atual após confirmação.
“Salvar revisão” preserva o texto e os vínculos no MySQL. “Salvar e gerar PDF” salva e abre a impressão do navegador: escolha salvar como PDF. Os checklists selecionados, itens e fotos são anexados.
Uma vistoria vinculada não pode ser excluída antes de ser desvinculada na revisão do contrato. Revisões concorrentes são verificadas para impedir sobrescrita silenciosa.

## Verificação
52 testes automatizados, testes de 13 páginas no Chrome e integração MySQL em transação revertida. Nenhum registro de teste foi mantido no banco.
