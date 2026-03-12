import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, AlertTriangle, CheckCircle, Scale, Eye, Phone } from 'lucide-react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';

export const Compliance: React.FC = () => {
  const navigate = useNavigate();
  const isBrandTheme = true;

  const themeClasses = {
    bg: isBrandTheme ? 'bg-gray-900' : 'bg-gray-50',
    cardBg: isBrandTheme ? 'bg-gray-800' : 'bg-white',
    text: isBrandTheme ? 'text-white' : 'text-gray-900',
    textSecondary: isBrandTheme ? 'text-gray-300' : 'text-gray-600',
    border: isBrandTheme ? 'border-gray-700' : 'border-gray-200',
  };

  return (
    <div className={`min-h-screen ${themeClasses.bg}`}>
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Navigation */}
        <button
          onClick={() => navigate('/')}
          className={`flex items-center space-x-2 ${themeClasses.textSecondary} hover:text-blue-600 transition-colors mb-8`}
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Voltar ao Início</span>
        </button>

        {/* Header */}
        <div className={`${themeClasses.cardBg} rounded-2xl shadow-sm border ${themeClasses.border} p-8 mb-8`}>
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
              <Scale className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className={`text-3xl font-bold ${themeClasses.text}`}>
                Compliance
              </h1>
              <p className={`${themeClasses.textSecondary}`}>
                Conduta ética, transparência e conformidade regulatória
              </p>
            </div>
          </div>
          
          <div className={`${isBrandTheme ? 'bg-purple-900/20 border-purple-700' : 'bg-purple-50 border-purple-200'} rounded-xl p-4 border`}>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-800 dark:text-purple-300">
                Operação transparente, legal e ética em conformidade com regulamentações brasileiras e internacionais
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className={`${themeClasses.cardBg} rounded-2xl shadow-sm border ${themeClasses.border} p-8`}>
          <div className="prose prose-lg max-w-none">
            <div className={themeClasses.text}>
              
              <h2 className="text-2xl font-bold mb-4">1. Política Antilavagem de Dinheiro (AML)</h2>
              <p className="mb-4">
                A VoxPredict implementa rigorosas políticas para evitar o uso da plataforma em crimes financeiros:
              </p>
              
              <h3 className="text-xl font-semibold mb-3">🔍 Monitoramento de Transações:</h3>
              <ul className="list-disc pl-6 mb-4">
                <li><strong>Análise automatizada:</strong> Sistemas de IA monitoram padrões suspeitos</li>
                <li><strong>Limites de transação:</strong> Valores elevados são sinalizados para revisão</li>
                <li><strong>Origem de fundos:</strong> Verificação da procedência de criptomoedas</li>
                <li><strong>Relatórios obrigatórios:</strong> Comunicação às autoridades quando necessário</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">🚫 Atividades Proibidas:</h3>
              <ul className="list-disc pl-6 mb-6">
                <li>Lavagem de dinheiro ou ocultação de origem de fundos</li>
                <li>Financiamento de atividades terroristas</li>
                <li>Evasão fiscal ou sonegação</li>
                <li>Manipulação de mercados ou insider trading</li>
                <li>Uso de fundos de origem criminosa</li>
              </ul>

              <h2 className="text-2xl font-bold mb-4">2. Conheça Seu Cliente (KYC/KYB)</h2>
              <p className="mb-4">
                Implementamos procedimentos de identificação conforme exigências regulatórias:
              </p>
              
              <h3 className="text-xl font-semibold mb-3">👤 Verificação de Usuários (KYC):</h3>
              <ul className="list-disc pl-6 mb-4">
                <li><strong>Identificação via carteira:</strong> Endereço blockchain único por usuário</li>
                <li><strong>Verificação de email:</strong> Confirmação de identidade digital</li>
                <li><strong>Análise comportamental:</strong> Padrões de uso para detecção de anomalias</li>
                <li><strong>Documentação adicional:</strong> Solicitada para transações de alto valor</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">🏢 Verificação de Parceiros (KYB):</h3>
              <ul className="list-disc pl-6 mb-6">
                <li>Due diligence de fornecedores e parceiros</li>
                <li>Verificação de licenças e autorizações</li>
                <li>Avaliação de riscos de compliance</li>
                <li>Monitoramento contínuo de relacionamentos comerciais</li>
              </ul>

              <h2 className="text-2xl font-bold mb-4">3. Regulamentação e Jurisdição</h2>
              <p className="mb-4">
                <strong>A plataforma opera sob a legislação brasileira e adere à regulamentação aplicável a ativos digitais:</strong>
              </p>
              
              <h3 className="text-xl font-semibold mb-3">🇧🇷 Legislação Brasileira:</h3>
              <ul className="list-disc pl-6 mb-4">
                <li><strong>LGPD:</strong> Lei Geral de Proteção de Dados (Lei nº 13.709/2018)</li>
                <li><strong>Marco Civil da Internet:</strong> Lei nº 12.965/2014</li>
                <li><strong>Código de Defesa do Consumidor:</strong> Lei nº 8.078/1990</li>
                <li><strong>Regulamentação CVM:</strong> Quando aplicável a ativos digitais</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">🌍 Padrões Internacionais:</h3>
              <ul className="list-disc pl-6 mb-6">
                <li>FATF (Financial Action Task Force) - Recomendações AML/CFT</li>
                <li>GDPR (quando aplicável a usuários europeus)</li>
                <li>Padrões de segurança ISO 27001</li>
                <li>Melhores práticas de blockchain e DeFi</li>
              </ul>

              <h2 className="text-2xl font-bold mb-4">4. Prevenção a Fraudes e Manipulação</h2>
              <p className="mb-4">Implementamos múltiplas camadas de proteção:</p>
              
              <h3 className="text-xl font-semibold mb-3">🔐 Segurança Técnica:</h3>
              <ul className="list-disc pl-6 mb-4">
                <li><strong>Auditoria de contratos inteligentes:</strong> Revisão por empresas especializadas</li>
                <li><strong>Oráculos confiáveis:</strong> Uso de fontes de dados verificadas e múltiplas</li>
                <li><strong>Monitoramento em tempo real:</strong> Detecção de atividades suspeitas</li>
                <li><strong>Limites de apostas:</strong> Prevenção de manipulação por grandes volumes</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">🛡️ Regras Contra Manipulação:</h3>
              <ul className="list-disc pl-6 mb-6">
                <li><strong>Proibição de colusão:</strong> Acordos entre usuários para manipular resultados</li>
                <li><strong>Informações privilegiadas:</strong> Proibido uso de insider information</li>
                <li><strong>Múltiplas contas:</strong> Um usuário por carteira/email</li>
                <li><strong>Bots e automação:</strong> Regulamentação de trading automatizado</li>
              </ul>

              <h2 className="text-2xl font-bold mb-4">5. Auditoria e Transparência</h2>
              <p className="mb-4">Mantemos os mais altos padrões de transparência:</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className={`${isBrandTheme ? 'bg-green-900/20' : 'bg-green-50'} rounded-xl p-4 text-center`}>
                  <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <h4 className="font-semibold text-green-800 dark:text-green-300 mb-1">Contratos Auditados</h4>
                  <p className="text-xs text-green-700 dark:text-green-400">
                    Smart contracts revisados por empresas especializadas
                  </p>
                </div>
                
                <div className={`${isBrandTheme ? 'bg-blue-900/20' : 'bg-blue-50'} rounded-xl p-4 text-center`}>
                  <Eye className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-1">Código Aberto</h4>
                  <p className="text-xs text-blue-700 dark:text-blue-400">
                    Contratos verificados e públicos na blockchain
                  </p>
                </div>
                
                <div className={`${isBrandTheme ? 'bg-purple-900/20' : 'bg-purple-50'} rounded-xl p-4 text-center`}>
                  <Shield className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <h4 className="font-semibold text-purple-800 dark:text-purple-300 mb-1">Relatórios Públicos</h4>
                  <p className="text-xs text-purple-700 dark:text-purple-400">
                    Publicação regular de métricas e auditorias
                  </p>
                </div>
              </div>

              <h2 className="text-2xl font-bold mb-4">6. Canal de Denúncia</h2>
              <p className="mb-4">
                Disponibilizamos canal seguro para relatar uso indevido, fraude ou violações:
              </p>
              
              <div className={`${isBrandTheme ? 'bg-red-900/20 border-red-700' : 'bg-red-50 border-red-200'} rounded-xl p-6 border mb-6`}>
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-6 h-6 text-red-600 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-3">
                      🚨 Canal de Denúncia
                    </h3>
                    <div className="space-y-2 text-sm text-red-700 dark:text-red-400">
                      <p><strong>Email:</strong> compliance@voxpredict.com</p>
                      <p><strong>Assunto:</strong> "DENÚNCIA - [Tipo de Violação]"</p>
                      <p><strong>Confidencialidade:</strong> Denúncias anônimas são aceitas</p>
                      <p><strong>Proteção:</strong> Proteção contra retaliação garantida</p>
                      <p><strong>Investigação:</strong> Todas as denúncias são investigadas</p>
                    </div>
                  </div>
                </div>
              </div>

              <h3 className="text-xl font-semibold mb-3">📋 Tipos de Denúncia Aceitas:</h3>
              <ul className="list-disc pl-6 mb-6">
                <li>Manipulação de mercados ou preços</li>
                <li>Uso de informações privilegiadas</li>
                <li>Lavagem de dinheiro ou atividades suspeitas</li>
                <li>Fraude ou tentativa de fraude</li>
                <li>Violação de termos de uso</li>
                <li>Comportamento antiético de usuários ou funcionários</li>
                <li>Problemas de segurança ou vulnerabilidades</li>
              </ul>

              <h2 className="text-2xl font-bold mb-4">7. Governança Corporativa</h2>
              <p className="mb-4">A VoxPredict adota as melhores práticas de governança:</p>
              
              <h3 className="text-xl font-semibold mb-3">🏛️ Estrutura de Governança:</h3>
              <ul className="list-disc pl-6 mb-4">
                <li><strong>Conselho Consultivo:</strong> Especialistas em blockchain, finanças e compliance</li>
                <li><strong>Comitê de Ética:</strong> Revisão de políticas e procedimentos</li>
                <li><strong>Auditoria Independente:</strong> Revisões periódicas por terceiros</li>
                <li><strong>Transparência Financeira:</strong> Relatórios públicos de receitas e gastos</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">📊 Métricas de Compliance:</h3>
              <ul className="list-disc pl-6 mb-6">
                <li>Taxa de detecção de fraudes: &gt;99.5%</li>
                <li>Tempo de resposta a denúncias: &lt;48 horas</li>
                <li>Uptime de sistemas de monitoramento: &gt;99.9%</li>
                <li>Conformidade com auditorias: 100%</li>
              </ul>

              <h2 className="text-2xl font-bold mb-4">8. Educação e Conscientização</h2>
              <p className="mb-4">Promovemos o uso responsável da plataforma:</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className={`${isBrandTheme ? 'bg-blue-900/20' : 'bg-blue-50'} rounded-xl p-4`}>
                  <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">📚 Recursos Educacionais</h4>
                  <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                    <li>• Guias sobre mercados preditivos</li>
                    <li>• Tutoriais de segurança blockchain</li>
                    <li>• Melhores práticas de investimento</li>
                    <li>• Alertas sobre riscos</li>
                  </ul>
                </div>
                
                <div className={`${isBrandTheme ? 'bg-amber-900/20' : 'bg-amber-50'} rounded-xl p-4`}>
                  <h4 className="font-semibold text-amber-800 dark:text-amber-300 mb-2">⚠️ Avisos de Risco</h4>
                  <ul className="text-sm text-amber-700 dark:text-amber-400 space-y-1">
                    <li>• Risco de perda total do capital</li>
                    <li>• Volatilidade de criptomoedas</li>
                    <li>• Natureza especulativa dos mercados</li>
                    <li>• Importância da diversificação</li>
                  </ul>
                </div>
              </div>

              <h2 className="text-2xl font-bold mb-4">9. Atualizações e Monitoramento</h2>
              <p className="mb-6">
                Nossas políticas de compliance são revisadas e atualizadas regularmente para manter 
                conformidade com mudanças regulatórias e melhores práticas da indústria. Monitoramos 
                continuamente desenvolvimentos legais e tecnológicos que possam impactar nossas operações.
              </p>

              <h2 className="text-2xl font-bold mb-4">10. Contatos de Compliance</h2>
              <p className="mb-4">Para questões relacionadas a compliance, ética ou denúncias:</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className={`${isBrandTheme ? 'bg-gray-700' : 'bg-gray-100'} rounded-xl p-4`}>
                  <h4 className="font-semibold mb-3">📧 Compliance Geral</h4>
                  <p className="text-sm mb-2"><strong>Email:</strong> compliance@voxpredict.com</p>
                  <p className="text-sm mb-2"><strong>Assunto:</strong> [COMPLIANCE] - Sua solicitação</p>
                  <p className="text-sm"><strong>Resposta:</strong> Até 48 horas</p>
                </div>
                
                <div className={`${isBrandTheme ? 'bg-gray-700' : 'bg-gray-100'} rounded-xl p-4`}>
                  <h4 className="font-semibold mb-3">🚨 Denúncias Urgentes</h4>
                  <p className="text-sm mb-2"><strong>Email:</strong> denuncia@voxpredict.com</p>
                  <p className="text-sm mb-2"><strong>Telefone:</strong> +55 (11) 99999-9999</p>
                  <p className="text-sm"><strong>Disponível:</strong> 24/7</p>
                </div>
              </div>

              <div className={`${isBrandTheme ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-200'} rounded-xl p-6 border mt-8`}>
                <div className="flex items-start space-x-2">
                  <Shield className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">
                      🛡️ Compromisso com a Integridade
                    </div>
                    <div className="text-xs text-green-700 dark:text-green-400">
                      <p>• Operação 100% transparente e auditável</p>
                      <p>• Conformidade total com regulamentações aplicáveis</p>
                      <p>• Proteção máxima aos usuários e seus dados</p>
                      <p>• Melhoria contínua de processos e políticas</p>
                      <p>• Colaboração proativa com autoridades reguladoras</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
