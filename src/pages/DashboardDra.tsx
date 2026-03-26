import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, LogOut, Search, MessageCircle } from 'lucide-react';

interface Lead {
  id: number;
  created_at: string;
  name: string;
  phone: string;
  status: string;
  answers: any;
  total_score: number;
}

export default function DashboardDra() {
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loadingAuth, setLoadingAuth] = useState(false);
  
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchLeads();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchLeads();
    });

    // Iniciar escuta "Em Tempo Real" do banco
    const realtimeChannel = supabase
      .channel('table-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quiz_submissions' },
        (_payload) => {
          fetchLeads(); // Recarregar tabela inteira quando algo mudar (novo lead ou status alterado)
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(realtimeChannel);
    };
  }, []);

  const fetchLeads = async () => {
    setLoadingData(true);
    const { data, error } = await supabase
      .from('quiz_submissions')
      .select('*')
      .eq('result', 'qualified')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar leads:', error);
    } else {
      setLeads(data || []);
    }
    setLoadingData(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAuth(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) alert(error.message);
    setLoadingAuth(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const updateStatus = async (id: number, newStatus: string) => {
    const { error } = await supabase
      .from('quiz_submissions')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      alert('Erro ao atualizar status');
    } else {
      setLeads(leads.map(lead => lead.id === id ? { ...lead, status: newStatus } : lead));
    }
  };

  // Se não estiver logado, mostra tela de Login
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-navy-light p-8 rounded-3xl border border-white/10 max-w-sm w-full space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gold uppercase tracking-widest mb-2">Acesso Privado</h2>
            <p className="text-text-muted text-sm">Painel exclusivo Dra. Mônica</p>
          </div>
          <div className="space-y-4">
            <input
              type="email"
              placeholder="E-mail"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-navy border border-white/10 rounded-xl px-4 py-3 text-white focus:border-gold outline-none"
            />
            <input
              type="password"
              placeholder="Senha"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-navy border border-white/10 rounded-xl px-4 py-3 text-white focus:border-gold outline-none"
            />
          </div>
          <button type="submit" disabled={loadingAuth} className="btn-gold w-full py-3 flex justify-center items-center">
            {loadingAuth ? <Loader2 className="animate-spin" /> : 'Entrar no Sistema'}
          </button>
        </form>
      </div>
    );
  }

  const filteredLeads = leads.filter(l => 
    l.name?.toLowerCase().includes(search.toLowerCase()) || 
    l.phone?.includes(search)
  );

  return (
    <div className="min-h-screen p-6 md:p-12">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Dashboard de Leads</h1>
            <p className="text-gold">Potenciais clientes qualificados pelo quiz</p>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-text-muted hover:text-white transition-colors border border-white/10 px-4 py-2 rounded-lg bg-navy-light">
            <LogOut size={18} /> Sair
          </button>
        </header>

        <div className="bg-navy-light border border-white/10 rounded-3xl p-6 md:p-8 space-y-6 overflow-x-auto">
          <div className="relative max-w-sm mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por nome ou telefone..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-navy border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:border-gold outline-none"
            />
          </div>

          {loadingData ? (
             <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gold" size={48} /></div>
          ) : (
            <div className="space-y-4">
              {/* Cabeçalho - Só aparece em telas médias/grandes (PC) */}
              <div className="hidden md:grid grid-cols-5 gap-4 px-4 py-3 border-b border-white/10 text-text-muted text-sm uppercase tracking-wider font-medium">
                <div>Data</div>
                <div>Lead</div>
                <div>Resumo do Perfil</div>
                <div>Status</div>
                <div className="text-right">Ação</div>
              </div>

              <div className="space-y-4">
                {filteredLeads.map((lead) => (
                  <div key={lead.id} className="bg-white/5 border border-white/5 p-4 rounded-2xl flex flex-col md:grid md:grid-cols-5 md:items-center gap-4 transition-colors hover:bg-white/10">
                    
                    {/* Bloco 1: Cabecalho do Card Mobile = Nome + Data */}
                    <div className="flex justify-between items-start md:block">
                      <div className="md:hidden">
                        <p className="text-white font-bold text-xl mb-1">{lead.name || 'Sem nome'}</p>
                        <p className="text-gold font-medium">{lead.phone || 'Sem telefone'}</p>
                      </div>
                      <div className="text-sm text-text-muted text-right md:text-left">
                        {new Date(lead.created_at).toLocaleDateString('pt-BR')} <br className="hidden md:block"/>
                        <span className="text-xs">{new Date(lead.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                    </div>

                    {/* Bloco 2: Nome e Telefone (PC apenas) */}
                    <div className="hidden md:block">
                      <p className="text-white font-medium">{lead.name || 'Sem nome'}</p>
                      <p className="text-gold text-sm">{lead.phone || 'Sem telefone'}</p>
                    </div>

                    {/* Bloco 3: Resumo das Respostas */}
                    <div className="text-sm text-text-light/80 bg-navy/30 md:bg-transparent p-3 md:p-0 rounded-xl">
                      <p><strong className="text-white/60">Profissão:</strong> {lead.answers['1'] || '-'}</p>
                      <p><strong className="text-white/60">Aposentou em:</strong> {lead.answers['3'] || '-'}</p>
                      <p><strong className="text-white/60">Múltiplos vínculos:</strong> {lead.answers['4'] || '-'}</p>
                    </div>

                    {/* Bloco 4: Controle de Status */}
                    <div>
                      <select 
                        value={lead.status || 'Novo'}
                        onChange={(e) => updateStatus(lead.id, e.target.value)}
                        className={`bg-transparent border rounded-xl px-3 py-2 md:py-1 w-full md:w-auto text-sm font-medium outline-none cursor-pointer
                          ${lead.status === 'Novo' ? 'border-blue-400 text-blue-400' : 
                            lead.status === 'Em Atendimento' ? 'border-yellow-400 text-yellow-400' : 
                            'border-emerald-400 text-emerald-400'}`}
                      >
                        <option className="bg-navy" value="Novo">Status: Novo</option>
                        <option className="bg-navy" value="Em Atendimento">Status: Em Atendimento</option>
                        <option className="bg-navy" value="Fechado">Status: Fechado</option>
                      </select>
                    </div>

                    {/* Bloco 5: Botão WhatsApp */}
                    <div className="flex justify-start md:justify-end mt-2 md:mt-0">
                      {lead.phone && (
                        <a 
                          href={`https://wa.me/55${lead.phone.replace(/\D/g, '')}?text=Olá ${lead.name}, sou da equipe jurídica da Dra Mônica Lucioli. Vimos que você completou nossa análise inicial sobre revisão da sua aposentadoria.`}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full md:w-auto flex justify-center items-center gap-2 bg-[#25D366] text-white px-5 py-3 md:py-2 rounded-xl font-bold hover:bg-[#1ebd59] transition-colors shadow-lg"
                        >
                          <MessageCircle size={20} /> <span className="md:hidden">Chamar no WhatsApp</span><span className="hidden md:inline">Chamar</span>
                        </a>
                      )}
                    </div>

                  </div>
                ))}
                
                {filteredLeads.length === 0 && (
                  <div className="py-12 text-center text-text-muted border border-dashed border-white/10 rounded-2xl">
                    Nenhum lead encontrado ainda.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
