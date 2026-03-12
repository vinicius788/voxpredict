import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, Eye, Database, UserCheck } from 'lucide-react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';

export const PrivacyPolicy: React.FC = () => {
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
            <div className="w-16 h-16 bg-gradient-to-r from-green-600 to-blue-600 rounded-xl flex items-center justify-center">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className={`text-3xl font-bold ${themeClasses.text}`}>
                Política de Privacidade
              </h1>
              <p className={`${themeClasses.textSecondary}`}>
                Como coletamos, usamos e protegemos seus dados pessoais
              </p>
            </div>
          </div>
          
          <div className={`${isBrandTheme ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-200'} rounded-xl p-4 border`}>
            <div className="flex items-center space-x-2">
              <Lock className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800 dark:text-green-300">
                Conforme LGPD (Lei Geral de Proteção de Dados) - Lei nº 13.709/2018
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className={`${themeClasses.cardBg} rounded-2xl shadow-sm border ${themeClasses.border} p-8`}>
          <div className="prose prose-lg max-w-none">
            <div className={themeClasses.text}>
              
              <h2 className="text-2xl font-bold mb-4">1. Quais Dados São Coletados</h2>
              <p className="mb-4">A VoxPredict coleta os seguintes tipos de dados pessoais:</p>
              
              <h3 className="text-xl font-semibold mb-3">📧 Dados de Identificação:</h3>
              <ul className="list-disc pl-6 mb-4">
                <li><strong>Nome completo:</strong> Para identificação na plataforma</li>
                <li><strong>Endereço de email:</strong> Para comunicação e autenticação</li>
                <li><strong>Endereço de carteira blockchain:</strong> Para transações e identificação única</li>
                <li><strong>Data de nascimento:</strong> Para verificação de idade mínima</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">🌐 Dados Técnicos:</h3>
              <ul className="list-disc pl-6 mb-4">
                <li><strong>Endereço IP:</strong> Para segurança e prevenção de fraudes</li>
                <li><strong>Dados de navegação:</strong> Páginas visitadas, tempo de sessão, cliques</li>
                <li><strong>Informações do dispositivo:</strong> Tipo de dispositivo, navegador, sistema operacional</li>
                <li><strong>Cookies e tecnologias similares:</strong> Para melhorar a experiência do usuário</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">💰 Dados Financeiros:</h3>
              <ul className="list-disc pl-6 mb-6">
                <li><strong>Histórico de transações:</strong> Apostas, depósitos, saques</li>
                <li><strong>Saldos de carteira:</strong> Para exibição na interface</li>
                <li><strong>Padrões de uso:</strong> Frequência e valores de apostas</li>
              </ul>

              <h2 className="text-2xl font-bold mb-4">2. Finalidade dos Dados</h2>
              <p className="mb-4">Utilizamos seus dados pessoais para as seguintes finalidades:</p>
              
              <h3 className="text-xl font-semibold mb-3">🔐 Acesso à Plataforma:</h3>
              <ul className="list-disc pl-6 mb-4">
                <li>Autenticação e autorização de usuários</li>
                <li>Manutenção de sessões seguras</li>
                <li>Personalização da experiência do usuário</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">📱 Comunicação:</h3>
              <ul className="list-disc pl-6 mb-4">
                <li>Envio de notificações sobre mercados e resultados</li>
                <li>Comunicação sobre atualizações da plataforma</li>
                <li>Suporte técnico e atendimento ao cliente</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">🛡️ Segurança e Antifraude:</h3>
              <ul className="list-disc pl-6 mb-4">
                <li>Detecção e prevenção de atividades fraudulentas</li>
                <li>Monitoramento de padrões suspeitos</li>
                <li>Cumprimento de obrigações regulatórias</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">📊 Melhoria do Produto:</h3>
              <ul className="list-disc pl-6 mb-6">
                <li>Análise de uso para melhorar funcionalidades</li>
                <li>Desenvolvimento de novos recursos</li>
                <li>Otimização de performance e usabilidade</li>
              </ul>

              <h2 className="text-2xl font-bold mb-4">3. Compartilhamento com Terceiros</h2>
              <p className="mb-4">
                <strong>Podemos compartilhar seus dados com parceiros de autenticação, hospedagem ou blockchain</strong> 
                nas seguintes situações:
              </p>
              <ul className="list-disc pl-6 mb-6">
                <li><strong>Provedores de serviços:</strong> Hospedagem, autenticação, análise de dados</li>
                <li><strong>Redes blockchain:</strong> Dados de transações são públicos por natureza</li>
                <li><strong>Autoridades competentes:</strong> Quando exigido por lei ou ordem judicial</li>
                <li><strong>Parceiros de compliance:</strong> Para verificação KYC/AML quando necessário</li>
                <li><strong>Sucessores comerciais:</strong> Em caso de fusão, aquisição ou venda de ativos</li>
              </ul>

              <h2 className="text-2xl font-bold mb-4">4. Armazenamento e Segurança</h2>
              <p className="mb-4">Implementamos as seguintes medidas de segurança:</p>
              
              <h3 className="text-xl font-semibold mb-3">🔒 Medidas Técnicas:</h3>
              <ul className="list-disc pl-6 mb-4">
                <li><strong>Criptografia:</strong> Dados sensíveis são criptografados em trânsito e em repouso</li>
                <li><strong>Controle de acesso:</strong> Acesso restrito apenas a pessoal autorizado</li>
                <li><strong>Monitoramento:</strong> Logs de segurança e detecção de intrusão</li>
                <li><strong>Backup seguro:</strong> Cópias de segurança criptografadas</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">🏢 Medidas Organizacionais:</h3>
              <ul className="list-disc pl-6 mb-6">
                <li>Treinamento de equipe em proteção de dados</li>
                <li>Políticas internas de segurança da informação</li>
                <li>Auditorias regulares de segurança</li>
                <li>Contratos de confidencialidade com fornecedores</li>
              </ul>

              <h2 className="text-2xl font-bold mb-4">5. Seus Direitos (LGPD)</h2>
              <p className="mb-4">Conforme a LGPD, você tem os seguintes direitos:</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className={`${isBrandTheme ? 'bg-blue-900/20' : 'bg-blue-50'} rounded-xl p-4`}>
                  <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">👁️ Acesso</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-400">
                    Solicitar cópia dos seus dados pessoais
                  </p>
                </div>
                
                <div className={`${isBrandTheme ? 'bg-green-900/20' : 'bg-green-50'} rounded-xl p-4`}>
                  <h4 className="font-semibold text-green-800 dark:text-green-300 mb-2">✏️ Correção</h4>
                  <p className="text-sm text-green-700 dark:text-green-400">
                    Corrigir dados incompletos ou incorretos
                  </p>
                </div>
                
                <div className={`${isBrandTheme ? 'bg-red-900/20' : 'bg-red-50'} rounded-xl p-4`}>
                  <h4 className="font-semibold text-red-800 dark:text-red-300 mb-2">🗑️ Exclusão</h4>
                  <p className="text-sm text-red-700 dark:text-red-400">
                    Solicitar exclusão dos seus dados
                  </p>
                </div>
                
                <div className={`${isBrandTheme ? 'bg-purple-900/20' : 'bg-purple-50'} rounded-xl p-4`}>
                  <h4 className="font-semibold text-purple-800 dark:text-purple-300 mb-2">📦 Portabilidade</h4>
                  <p className="text-sm text-purple-700 dark:text-purple-400">
                    Transferir dados para outra plataforma
                  </p>
                </div>
              </div>

              <h2 className="text-2xl font-bold mb-4">6. Retenção de Dados</h2>
              <p className="mb-6">
                Mantemos seus dados pessoais pelo tempo necessário para cumprir as finalidades descritas 
                nesta política, respeitando os prazos legais de retenção. Dados de transações blockchain 
                são permanentes por natureza da tecnologia.
              </p>

              <h2 className="text-2xl font-bold mb-4">7. Transferência Internacional</h2>
              <p className="mb-6">
                Seus dados podem ser transferidos e processados em países fora do Brasil, sempre com 
                garantias adequadas de proteção conforme exigido pela LGPD.
              </p>

              <h2 className="text-2xl font-bold mb-4">8. Contato do Encarregado de Dados (DPO)</h2>
              <p className="mb-4">
                Para exercer seus direitos ou esclarecer dúvidas sobre proteção de dados, entre em contato 
                com nosso Encarregado de Proteção de Dados:
              </p>
              <ul className="list-disc pl-6 mb-6">
                <li><strong>Email:</strong> privacidade@voxpredict.com</li>
                <li><strong>Assunto:</strong> "LGPD - Solicitação de Direitos"</li>
                <li><strong>Prazo de resposta:</strong> Até 15 dias úteis</li>
              </ul>

              <div className={`${isBrandTheme ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'} rounded-xl p-6 border mt-8`}>
                <div className="flex items-start space-x-2">
                  <UserCheck className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                      💡 Seus Dados, Seus Direitos
                    </div>
                    <div className="text-xs text-blue-700 dark:text-blue-400">
                      <p>• Você tem controle total sobre seus dados pessoais</p>
                      <p>• Pode solicitar acesso, correção ou exclusão a qualquer momento</p>
                      <p>• Respeitamos integralmente a LGPD e regulamentações internacionais</p>
                      <p>• Transparência total sobre como seus dados são utilizados</p>
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
