/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, CheckCircle2, AlertCircle, ChevronRight, Phone, Mail, Loader2 } from 'lucide-react';
import { supabase } from './lib/supabase';

type QuizState = 'loading' | 'hero' | 'quiz' | 'lead_form' | 'result' | 'disqualified';

interface QuestionOption {
  id: number;
  text: string;
  value: string;
  score: number;
  disqualifies: boolean;
}

interface Question {
  id: number;
  text: string;
  progress_message: string | null;
  question_options: QuestionOption[];
}

export default function App() {
  const [state, setState] = useState<QuizState>('loading');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // States para o formulário de lead
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Buscar perguntas do Supabase ao carregar
  useEffect(() => {
    async function fetchQuestions() {
      const { data, error } = await supabase
        .from('questions')
        .select('id, text, progress_message, question_options(id, text, value, score, disqualifies)')
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Erro ao buscar perguntas:', error);
        setState('hero');
        return;
      }

      // Ordenar as opções de cada pergunta
      const sorted = (data || []).map((q: any) => ({
        ...q,
        question_options: q.question_options.sort((a: any, b: any) => a.id - b.id),
      }));

      setQuestions(sorted);
      setState('hero');
    }

    fetchQuestions();
  }, []);

  const handleOptionSelect = async (option: QuestionOption, questionId: number) => {
    const newAnswers = { ...answers, [questionId]: option.value };
    setAnswers(newAnswers);

    if (option.disqualifies) {
      // Salvar submissão como desqualificado
      await supabase.from('quiz_submissions').insert({
        answers: newAnswers,
        total_score: score,
        result: 'disqualified',
      });
      setState('disqualified');
      return;
    }

    const newScore = score + option.score;
    setScore(newScore);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Se chegou no fim e não foi desqualificado, vamos coletar os contatos
      setState('lead_form');
    }
  };

      // Preparar a mensagem curta e direta para o usuário enviar para a Dra.
      const message = `Olá Dra. Mônica Lucioli! Acabei de completar a análise no seu site e fui qualificado para a revisão.\n\n` +
        `Nome: ${name}\n` +
        `Telefone: ${phone}\n\n` +
        `Quero agendar meu atendimento inicial gratuito.`;

      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/5532991652789?text=${encodedMessage}`;

      // Ir para a tela de sucesso (onde ele vê a mensagem de boas-vindas)
      setState('result');

      // Abrir o WhatsApp em uma nova aba após 2 segundos (tempo de ler a mensagem na tela)
      setTimeout(() => {
        window.open(whatsappUrl, '_blank');
      }, 2500);
      
    } catch (error) {
      console.error('Erro ao processar lead:', error);
      setState('result');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.playbackRate = 1.3;
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="min-h-screen flex flex-col items-center">
      <main className="w-full max-w-6xl px-6 py-12 md:py-24">
        <AnimatePresence mode="wait">
          {state === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="min-h-[60vh] flex flex-col items-center justify-center gap-4"
            >
              <Loader2 size={48} className="text-gold animate-spin" />
              <p className="text-text-muted text-lg">Carregando...</p>
            </motion.div>
          )}

          {state === 'hero' && (
            <motion.div
              key="hero"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="relative min-h-[85vh] md:min-h-[90vh] flex flex-col justify-between overflow-hidden rounded-[2.5rem] lg:rounded-[3rem] border border-white/10 shadow-2xl bg-navy"
            >
              {/* Background Image with Gradient Overlay */}
              <div className="absolute inset-0 z-0">
                <img 
                  src="/foto-doutora.jpeg" 
                  alt="Dra. Mônica Lucioli" 
                  className="w-full h-full object-cover lg:object-contain object-top lg:object-right opacity-90"
                  referrerPolicy="no-referrer"
                  loading="eager"
                />
                
                {/* Camada escura semi-transparente sobre a foto inteira para dar destaque à copy */}
                <div className="absolute inset-0 bg-black/40" />
                {/* Gradient da Esquerda (Desktop) para fazer o texto brilhar na esquerda e sumir a borda da foto */}
                <div className="hidden lg:block absolute inset-0 bg-gradient-to-r from-navy via-navy/90 to-transparent w-3/4" />

                {/* Gradient do Topo (Mobile) para a Headline ficar legível */}
                <div className="lg:hidden absolute inset-x-0 top-0 bg-gradient-to-b from-navy/80 via-navy/40 to-transparent h-[25%]" />

                {/* Gradient de Baixo para Cima - menor no mobile para não escurecer o rosto */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy via-navy/95 to-transparent h-[40%] lg:h-[40%]" />
              </div>

              {/* HEADLINE NO TOPO (Mobile e Desktop) */}
              <div className="relative z-10 w-full lg:max-w-xl p-6 md:p-12 lg:p-16 pt-8 md:pt-12 lg:pt-16">
                <header>
                  <h2 className="text-gold text-xl md:text-2xl lg:text-3xl font-bold tracking-widest uppercase drop-shadow-xl mb-1 lg:mb-2">
                    Dra. Mônica Lucioli
                  </h2>
                  <p className="text-white/90 font-medium text-xs md:text-base lg:text-xl uppercase tracking-widest drop-shadow-lg">
                    Advocacia Previdenciária
                  </p>
                </header>
              </div>

              {/* BLOCO DE CONTEÚDO INFERIOR (Mobile e Desktop) */}
              <div className="relative z-10 w-full lg:max-w-4xl p-6 md:p-12 lg:p-16 mt-auto">
                <div className="space-y-4 lg:space-y-6">
                  <h1 className="text-2xl md:text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight text-white drop-shadow-lg">
                    Exclusivo para professores e profissionais da saúde aposentados até 2019
                  </h1>
                  <p className="text-base md:text-xl lg:text-2xl text-text-light/90 leading-relaxed max-w-2xl">
                    Se você aposentou antes ou em 2019? Você pode ter direito à revisão do benefício.
                  </p>
                </div>

                {/* Audio Player */}
                <div className="bg-navy/60 backdrop-blur-md p-6 rounded-2xl border border-gold/20 flex items-center gap-6 max-w-md">
                  <button
                    onClick={toggleAudio}
                    className="w-14 h-14 bg-gold rounded-full flex items-center justify-center text-navy hover:bg-gold-hover transition-colors shadow-lg shrink-0"
                  >
                    {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} className="ml-1" fill="currentColor" />}
                  </button>
                  <div>
                    <p className="text-gold font-bold text-lg">Mensagem da advogada</p>
                    <p className="text-text-muted text-sm">Ouça uma breve explicação sobre seus direitos</p>
                  </div>
                  <audio
                    ref={audioRef}
                    src="/audio-advogada.ogg"
                    onEnded={() => setIsPlaying(false)}
                  />
                </div>

                <div className="pt-4">
                  <button
                    onClick={() => setState('quiz')}
                    className="btn-gold w-full md:w-auto flex items-center justify-center gap-3 px-12"
                  >
                    Verificar meu caso agora
                    <ChevronRight size={24} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {state === 'quiz' && (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-2xl mx-auto w-full space-y-10"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <p className="text-gold font-bold text-lg">Pergunta {currentQuestionIndex + 1} de {questions.length}</p>
                  <p className="text-text-muted">Progresso: {Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}%</p>
                </div>
                <div className="h-3 bg-navy-light rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gold"
                    initial={{ width: '0%' }}
                    animate={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                  />
                </div>
                {questions[currentQuestionIndex]?.progress_message && (
                  <p className="text-gold italic text-center animate-pulse">
                    {questions[currentQuestionIndex].progress_message}
                  </p>
                )}
              </div>

              <div className="space-y-8">
                <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">
                  {currentQuestion.text}
                </h2>
                <div className="grid grid-cols-1 gap-4">
                  {currentQuestion?.question_options.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleOptionSelect(option, currentQuestion.id)}
                      className="quiz-option"
                    >
                      {option.text}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {state === 'lead_form' && (
            <motion.div
              key="lead_form"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-2xl mx-auto space-y-8"
            >
              <div className="text-center space-y-4">
                <CheckCircle2 size={64} className="text-gold mx-auto mb-6" />
                <h2 className="text-3xl md:text-4xl font-bold text-white">Ótima notícia!</h2>
                <p className="text-xl text-text-light/90 leading-relaxed bg-navy-light p-6 rounded-2xl border border-gold/20">
                  Seu perfil está dentro dos critérios para análise. 
                  Você será encaminhado para o atendimento com um advogado da nossa equipe. <br/><br/>
                  <span className="text-gold font-semibold uppercase tracking-wide">Este atendimento inicial não tem custos.</span>
                </p>
              </div>

              <form onSubmit={handleLeadSubmit} className="space-y-6 pt-4">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-text-muted mb-2 text-sm font-semibold uppercase tracking-wider">
                      Seu Nome Completo
                    </label>
                    <input
                      id="name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Maria da Silva"
                      className="w-full bg-navy-light border border-white/10 rounded-xl px-4 py-4 text-white placeholder:text-white/20 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors text-lg"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-text-muted mb-2 text-sm font-semibold uppercase tracking-wider">
                      Seu WhatsApp (com DDD)
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Ex: (11) 99999-9999"
                      className="w-full bg-navy-light border border-white/10 rounded-xl px-4 py-4 text-white placeholder:text-white/20 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors text-lg"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-gold w-full flex items-center justify-center gap-3 py-4 text-lg mt-8"
                >
                  {isSubmitting ? (
                    <><Loader2 size={24} className="animate-spin" /> Processando...</>
                  ) : (
                    <>Falar com Advogado Agora <ChevronRight size={24} /></>
                  )}
                </button>
              </form>
            </motion.div>
          )}

          {state === 'result' && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-2xl mx-auto text-center space-y-8"
            >
              <div className="flex justify-center">
                <CheckCircle2 size={100} className="text-gold animate-bounce" />
              </div>
              
              <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">
                Análise Concluída com Sucesso!
              </h2>

              <div className="bg-navy-light p-8 md:p-12 rounded-[2.5rem] border-2 border-gold/30 space-y-8 shadow-2xl">
                <p className="text-2xl md:text-3xl text-white font-medium leading-relaxed">
                  Seja bem-vindo ao escritório da <span className="text-gold">Dra. Mônica Lucioli!</span>
                </p>
                
                <p className="text-xl md:text-2xl text-text-light/90 leading-relaxed">
                  Faça um resumo do seu caso que já já vamos prosseguir com seu atendimento.
                </p>

                <div className="bg-gold/10 p-4 rounded-xl border border-gold/20">
                  <p className="text-lg md:text-xl text-gold font-bold">
                    Ah… fique à vontade, esse primeiro atendimento não tem custas!
                  </p>
                </div>

                <div className="pt-4">
                  <p className="text-text-muted mb-6 text-sm">Estamos te encaminhando para o WhatsApp...</p>
                  <button
                    onClick={() => {
                      const message = `Olá Dra. Mônica Lucioli! Acabei de completar a análise no seu site e fui qualificado para a revisão.\n\nNome: ${name}\nTelefone: ${phone}\n\nQuero agendar meu atendimento inicial gratuito.`;
                      window.open(`https://wa.me/5532991652789?text=${encodeURIComponent(message)}`, '_blank');
                    }}
                    className="btn-gold w-full flex items-center justify-center gap-4 py-6 text-2xl shadow-[0_0_30px_rgba(201,168,76,0.5)]"
                  >
                    <Phone size={32} fill="currentColor" />
                    Falar agora no WhatsApp
                  </button>
                </div>
              </div>

              <button
                onClick={() => {
                  setState('hero');
                  setCurrentQuestionIndex(0);
                  setScore(0);
                  setAnswers({});
                  setName('');
                  setPhone('');
                }}
                className="text-text-muted hover:text-gold transition-colors text-lg"
              >
                Voltar à página inicial
              </button>
            </motion.div>
          )}

          {state === 'disqualified' && (
            <motion.div
              key="disqualified"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-2xl mx-auto text-center space-y-8"
            >
              <div className="flex justify-center">
                <AlertCircle size={80} className="text-text-muted" />
              </div>
              <h2 className="text-4xl font-bold text-white">Verificação Concluída</h2>
              <div className="bg-navy-light p-8 rounded-3xl border border-white/10 space-y-6">
                <p className="text-xl text-text-muted leading-relaxed">
                  Agradecemos o seu interesse. No momento, esta análise específica de revisão é destinada exclusivamente a:
                </p>
                <ul className="text-left text-lg text-text-muted space-y-3 list-disc list-inside max-w-md mx-auto">
                  <li>Professores ou Profissionais da Saúde</li>
                  <li>Já aposentados</li>
                  <li>Aposentadorias concedidas até 2019</li>
                </ul>
                <p className="text-xl text-text-muted leading-relaxed pt-4">
                  Caso você não se enquadre nestes critérios, sua situação atual pode não ser passível desta revisão específica.
                </p>
              </div>
              <button
                onClick={() => {
                  setState('hero');
                  setCurrentQuestionIndex(0);
                  setScore(0);
                  setAnswers({});
                  setName('');
                  setPhone('');
                }}
                className="text-gold border-b border-gold pb-1 hover:text-gold-hover hover:border-gold-hover transition-colors"
              >
                Voltar ao início
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="w-full py-12 border-t border-white/10 mt-auto">
        <div className="max-w-6xl mx-auto px-6 text-center space-y-4">
          <p className="text-text-muted">© 2026 Mônica Lucioli Advocacia Previdenciária. Todos os direitos reservados.</p>
          <p className="text-text-muted text-sm max-w-2xl mx-auto">
            Este site tem caráter meramente informativo e não constitui promessa de ganho financeiro. 
            A análise de cada caso é individual e depende de critérios legais específicos.
          </p>
        </div>
      </footer>
    </div>
  );
}
