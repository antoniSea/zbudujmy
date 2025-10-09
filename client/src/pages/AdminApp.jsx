import React from 'react';
import { recordings, leads, employees } from '../services/ccm';

export default function AdminApp() {
  const [tab, setTab] = React.useState('leads');
  const [leadData, setLeadData] = React.useState({ leads: [] });
  const [recs, setRecs] = React.useState({ recordings: [] });
  const [emps, setEmps] = React.useState({ employees: [] });

  React.useEffect(() => {
    if (tab === 'leads') loadLeads();
    if (tab === 'recordings') loadRecordings();
    if (tab === 'employees') loadEmployees();
  }, [tab]);

  const loadLeads = async () => setLeadData(await leads.list());
  const loadRecordings = async () => setRecs(await recordings.adminList());
  const loadEmployees = async () => setEmps(await employees.list());

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="SoftSynergy" className="h-8 w-8" />
            <div>
              <h1 className="text-xl font-semibold text-slate-900">SoftSynergy</h1>
              <p className="text-xs text-orange-500">Innovative Software Solutions</p>
            </div>
          </div>
          <nav className="flex gap-4">
            {['leads','employees','recordings'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-2 rounded-md text-sm font-medium ${tab===t?'bg-blue-600 text-white':'text-slate-700 hover:bg-slate-100'}`}>
                {t === 'leads' ? 'Leady' : t === 'employees' ? 'Pracownicy' : 'Nagrania'}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        {tab === 'leads' && (
          <div className="bg-white rounded-lg shadow p-4">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-600">
                    <th className="px-4 py-2">Nazwa</th>
                    <th className="px-4 py-2">Telefon</th>
                    <th className="px-4 py-2">Email</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Przypisany</th>
                  </tr>
                </thead>
                <tbody>
                  {leadData.leads.map(l => {
                    const now = new Date();
                    const hasTimeout = l.nextCallTime && new Date(l.nextCallTime) > now;
                    return (
                      <tr key={l.id} className="border-t">
                        <td className="px-4 py-2 font-medium">{l.name}</td>
                        <td className="px-4 py-2 text-slate-600">{l.phone}</td>
                        <td className="px-4 py-2 text-slate-600">{l.email}</td>
                        <td className="px-4 py-2">
                          <span className="px-2 py-1 rounded-full text-xs bg-slate-100 text-slate-700">{l.status}</span>
                          {hasTimeout && (
                            <span className="ml-2 px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">Timeout do {new Date(l.nextCallTime).toLocaleString()}</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-slate-600">{l.assignedTo ? l.assignedTo.name : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'recordings' && (
          <div className="bg-white rounded-lg shadow p-4 space-y-3">
            {recs.recordings.map(r => (
              <div key={r.id} className="flex items-center justify-between border rounded-md p-3">
                <div className="flex items-center gap-3">
                  <i className="fa-solid fa-microphone text-blue-600" />
                  <div>
                    <div className="font-medium">{r.lead?.name || 'Usunięty lead'}</div>
                    <div className="text-xs text-slate-500">{new Date(r.startTime).toLocaleString()}</div>
                    <div className="text-xs text-slate-500">Pracownik: {r.employee?.name || '—'}</div>
                  </div>
                </div>
                <audio controls className="h-8">
                  <source src={r.recordingUrl} type="audio/webm" />
                </audio>
              </div>
            ))}
          </div>
        )}

        {tab === 'employees' && (
          <div className="bg-white rounded-lg shadow p-4">
            <ul className="divide-y">
              {emps.employees.map(e => (
                <li key={e.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{e.name}</div>
                    <div className="text-xs text-slate-500">{e.email}</div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${e.isAvailable?'bg-green-100 text-green-800':'bg-red-100 text-red-800'}`}>{e.isAvailable?'Dostępny':'Zajęty'}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}



