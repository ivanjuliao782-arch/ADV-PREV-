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
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-white/10 text-text-muted text-sm uppercase tracking-wider">
                  <th className="pb-4 font-medium">Data</th>
                  <th className="pb-4 font-medium">Lead</th>
                  <th className="pb-4 font-medium">Resumo do Perfil</th>
                  <th className="pb-4 font-medium">Status</th>
                  <th className="pb-4 font-medium text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 text-sm text-text-muted whitespace-nowrap">
                      {new Date(lead.created_at).toLocaleDateString('pt-BR')} <br/>
                      <span className="text-xs">{new Date(lead.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span>
                    </td>
                    <td className="py-4">
                      <p className="text-white font-medium">{lead.name || 'Sem nome'}</p>
                      <p className="text-gold text-sm">{lead.phone || 'Sem telefone'}</p>
                    </td>
                    <td className="py-4 text-sm text-text-light/80">
                      <p><strong>Profissão:</strong> {lead.answers['1'] || '-'}</p>
                      <p><strong>Aposentou em:</strong> {lead.answers['3'] || '-'}</p>
                      <p><strong>Múltiplos vínculos:</strong> {lead.answers['4'] || '-'}</p>
                    </td>
                    <td className="py-4">
                      <select 
                        value={lead.status || 'Novo'}
                        onChange={(e) => updateStatus(lead.id, e.target.value)}
                        className={`bg-transparent border rounded-lg px-2 py-1 text-sm font-medium outline-none
                          ${lead.status === 'Novo' ? 'border-blue-400 text-blue-400' : 
                            lead.status === 'Em Atendimento' ? 'border-yellow-400 text-yellow-400' : 
                            'border-emerald-400 text-emerald-400'}`}
                      >
                        <option className="bg-navy" value="Novo">Novo</option>
                        <option className="bg-navy" value="Em Atendimento">Em Atendimento</option>
                        <option className="bg-navy" value="Fechado">Fechado</option>
                      </select>
                    </td>
                    <td className="py-4 text-right">
                      {lead.phone && (
                        <a 
                          href={`https://wa.me/55${lead.phone.replace(/\D/g, '')}?text=Olá ${lead.name}, sou da equipe jurídica da Dra Mônica Lucioli. Vimos que você completou nossa análise inicial sobre revisão da sua aposentadoria.`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 bg-[#25D366] text-white px-4 py-2 rounded-xl font-medium hover:bg-[#1ebd59] transition-colors"
                        >
                          <MessageCircle size={18} /> Chamar
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredLeads.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-text-muted">Nenhum lead encontrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
