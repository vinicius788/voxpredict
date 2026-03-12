import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, FileText, Calendar } from 'lucide-react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';

export const TermsOfService: React.FC = () => {
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
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className={`text-3xl font-bold ${themeClasses.text}`}>
                Termos de Uso
              </h1>
              <p className={`${themeClasses.textSecondary}`}>
                Contrato entre a plataforma VoxPredict e o usuário
              </p>
            </div>
          </div>
          
          <div className={`${isBrandTheme ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'} rounded-xl p-4 border`}>
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                Última atualização: 15 de Janeiro de 2025
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className={`${themeClasses.cardBg} rounded-2xl shadow-sm border ${themeClasses.border} p-8`}>
          <div className="prose prose-lg max-w-none">
            <div className={themeClasses.text}>
              
              <h2 className="text-2xl font-bold mb-4">1. Descrição do Serviço</h2>
              <p className="mb-6">
                A VoxPredict é uma plataforma de previsão descentralizada onde usuários apostam em eventos futuros usando tecnologia blockchain. 
                Nossa plataforma permite que os usuários façam previsões sobre eventos políticos, econômicos, esportivos e outros acontecimentos 
                verificáveis, utilizando criptomoedas como USDT, USDC e DAI.
              </p>

              <h2 className="text-2xl font-bold mb-4">2. Idade Mínima e Elegibilidade</h2>
              <p className="mb-6">
                <strong>Proibido para menores de 18 anos.</strong> Ao usar a VoxPredict, você declara e garante que:
              </p>
              <ul className="list-disc pl-6 mb-6">
                <li>Tem pelo menos 18 anos de idade</li>
                <li>Possui capacidade legal para celebrar contratos</li>
                <li>Não está localizado em jurisdição onde o uso da plataforma seja proibido</li>
                <li>Cumprirá todas as leis locais aplicáveis</li>
              </ul>

              <h2 className="text-2xl font-bold mb-4">3. Responsabilidades do Usuário</h2>
              <p className="mb-4">O usuário é integralmente responsável por:</p>
              <ul className="list-disc pl-6 mb-6">
                <li><strong>Suas apostas e previsões:</strong> Todas as decisões de investimento são de sua exclusiva responsabilidade</li>
                <li><strong>Informações fornecidas:</strong> Veracidade e atualização dos dados pessoais</li>
                <li><strong>Segurança da carteira:</strong> Proteção de chaves privadas e senhas</li>
                <li><strong>Conformidade legal:</strong> Cumprimento das leis de sua jurisdição</li>
                <li><strong>Uso adequado:</strong> Não utilizar a plataforma para atividades ilegais ou fraudulentas</li>
              </ul>

              <h2 className="text-2xl font-bold mb-4">4. Limitação de Responsabilidade da VoxPredict</h2>
              <p className="mb-4">
                <strong>A VoxPredict não garante lucros nem a veracidade dos resultados fornecidos por terceiros.</strong> 
                Especificamente, a plataforma:
              </p>
              <ul className="list-disc pl-6 mb-6">
                <li>Não garante ganhos ou retornos financeiros</li>
                <li>Não se responsabiliza por perdas decorrentes de previsões incorretas</li>
                <li>Não garante a precisão de dados fornecidos por oráculos externos</li>
                <li>Não se responsabiliza por falhas técnicas da blockchain</li>
                <li>Não garante disponibilidade ininterrupta do serviço</li>
                <li>Não se responsabiliza por decisões de investimento dos usuários</li>
              </ul>

              <h2 className="text-2xl font-bold mb-4">5. Encerramento de Contas</h2>
              <p className="mb-4">A VoxPredict reserva-se o direito de suspender ou encerrar contas nas seguintes situações:</p>
              <ul className="list-disc pl-6 mb-6">
                <li>Violação destes Termos de Uso</li>
                <li>Atividades fraudulentas ou suspeitas</li>
                <li>Manipulação de mercados ou colusão</li>
                <li>Fornecimento de informações falsas</li>
                <li>Uso de múltiplas contas para contornar limites</li>
                <li>Atividades que prejudiquem outros usuários ou a plataforma</li>
              </ul>

              <h2 className="text-2xl font-bold mb-4">6. Propriedade Intelectual</h2>
              <p className="mb-6">
                Todos os direitos de propriedade intelectual relacionados à VoxPredict, incluindo mas não limitado a:
                interface, marca, algoritmos, código-fonte, design, conteúdo e metodologias são de propriedade 
                exclusiva da VoxPredict ou de seus licenciadores. É proibida a reprodução, distribuição ou 
                uso comercial sem autorização expressa.
              </p>

              <h2 className="text-2xl font-bold mb-4">7. Riscos e Avisos</h2>
              <div className={`${isBrandTheme ? 'bg-amber-900/20 border-amber-700' : 'bg-amber-50 border-amber-200'} rounded-xl p-4 border mb-6`}>
                <div className="flex items-start space-x-2">
                  <Shield className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-2">
                      ⚠️ Aviso Importante sobre Riscos
                    </div>
                    <div className="text-xs text-amber-700 dark:text-amber-400">
                      <p>• Mercados preditivos envolvem risco de perda total do capital investido</p>
                      <p>• Preços de criptomoedas são voláteis e podem resultar em perdas</p>
                      <p>• Resultados passados não garantem resultados futuros</p>
                      <p>• Invista apenas o que pode perder sem comprometer sua situação financeira</p>
                    </div>
                  </div>
                </div>
              </div>

              <h2 className="text-2xl font-bold mb-4">8. Taxas e Pagamentos</h2>
              <p className="mb-6">
                A VoxPredict cobra uma taxa de 3% sobre as apostas perdedoras para manutenção da plataforma. 
                Esta taxa é automaticamente deduzida pelos smart contracts e é transparente para todos os usuários. 
                Não há taxas ocultas ou custos adicionais além das taxas de rede blockchain.
              </p>

              <h2 className="text-2xl font-bold mb-4">9. Atualizações dos Termos</h2>
              <p className="mb-6">
                <strong>Podemos alterar os Termos a qualquer momento.</strong> As alterações entrarão em vigor 
                imediatamente após a publicação na plataforma. É responsabilidade do usuário revisar 
                periodicamente estes termos. O uso continuado da plataforma após alterações constitui 
                aceitação dos novos termos.
              </p>

              <h2 className="text-2xl font-bold mb-4">10. Lei Aplicável e Jurisdição</h2>
              <p className="mb-6">
                Estes Termos são regidos pelas leis da República Federativa do Brasil. Qualquer disputa 
                será resolvida nos tribunais competentes do Brasil, especificamente no foro da cidade 
                de São Paulo, Estado de São Paulo.
              </p>

              <h2 className="text-2xl font-bold mb-4">11. Contato</h2>
              <p className="mb-6">
                Para dúvidas sobre estes Termos de Uso, entre em contato:
              </p>
              <ul className="list-disc pl-6 mb-6">
                <li><strong>Email:</strong> legal@voxpredict.com</li>
                <li><strong>Endereço:</strong> São Paulo, SP, Brasil</li>
                <li><strong>Suporte:</strong> suporte@voxpredict.com</li>
              </ul>

              <div className={`${isBrandTheme ? 'bg-gray-700' : 'bg-gray-100'} rounded-xl p-6 mt-8`}>
                <p className="text-sm text-center">
                  <strong>Ao usar a VoxPredict, você concorda integralmente com estes Termos de Uso.</strong>
                </p>
                <p className="text-xs text-center mt-2 opacity-75">
                  Documento válido a partir de 15 de Janeiro de 2025
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
