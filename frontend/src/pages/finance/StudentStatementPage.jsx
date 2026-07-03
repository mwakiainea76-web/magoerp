import { Fragment, useEffect, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import logo from '@/assets/logo.PNG';
import { LookupSelect } from '@/components/LookupSelect';
import { useInvoicesApi } from '@/hooks/useInvoicesApi';
import { useLookupApi } from '@/hooks/useLookupApi';
import { useAuthStore } from '@/store/authStore';

const amount = (value) => Number(value || 0).toLocaleString('en-KE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const valueOrDash = (value) => value || '-';

const statementStyles = [
  '.statement-print-area{min-height:297mm;padding:10mm 14mm 11mm;border:1px solid #d1d5db;box-shadow:0 8px 24px rgba(15,23,42,.08);color:#000;font-family:Arial,Helvetica,sans-serif;font-size:8pt;line-height:1.18}',
  '.statement-generated-at{margin:0;font-size:7.5pt}',
  '.statement-header{margin-top:3mm;text-align:center}',
  '.statement-header img{width:21mm;height:21mm;margin:0 auto 1.5mm;object-fit:contain}',
  '.statement-header h1{margin:0;font-size:14pt;font-weight:700;text-transform:uppercase}',
  '.statement-header p{margin:.5mm 0 0;font-size:8pt}',
  '.statement-header h2{margin:3mm 0 0;font-size:10pt;font-weight:700}',
  '.statement-rule{margin-top:2.7mm;border-top:1px solid #000}',
  '.statement-details{width:100%;margin-top:1.5mm;border-collapse:collapse;table-layout:fixed}',
  '.statement-details th{width:17%;padding:1.4mm 1mm;text-align:left;vertical-align:top;font-size:8pt;font-weight:700}',
  '.statement-details td{width:33%;padding:1.4mm 1mm;vertical-align:top;font-size:8pt}',
  '.statement-ledger{width:100%;margin-top:2mm;border-collapse:collapse;table-layout:fixed}',
  '.statement-ledger th,.statement-ledger td{border:1px solid #000;padding:1.45mm 1mm;vertical-align:top}',
  '.statement-ledger thead th{text-align:left;font-size:8pt;font-weight:700;vertical-align:middle}',
  '.statement-ledger .statement-number{width:6%}',
  '.statement-ledger .statement-date{width:11%}',
  '.statement-ledger .statement-reference{width:11%}',
  '.statement-ledger .statement-money{width:15%;text-align:center}',
  '.statement-session-row th{padding:1.5mm 1mm;text-align:left;font-size:8pt;font-weight:700;text-transform:uppercase}',
  '.statement-transaction-row td{font-size:7.5pt}',
  '.statement-amount{text-align:right;white-space:nowrap}',
  '.statement-empty{padding:8mm!important;text-align:center}',
  '.statement-total-row th{font-size:8pt;text-align:right}',
  '.statement-footer{display:flex;justify-content:space-between;margin-top:3mm;border-top:1px solid #000;padding-top:1.5mm;font-size:7.5pt;font-weight:600;text-transform:uppercase}',
  '@media print{@page{size:A4 portrait;margin:10mm 14mm 11mm}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}body *{visibility:hidden!important}.statement-print-area,.statement-print-area *{visibility:visible!important}.statement-print-area{position:absolute;inset:0;width:100%;min-height:auto;padding:0;border:0;box-shadow:none}.no-print{display:none!important}.statement-ledger thead{display:table-header-group}.statement-transaction-row,.statement-session-row,.statement-total-row{break-inside:avoid;page-break-inside:avoid}.statement-session-row{break-after:avoid;page-break-after:avoid}}',
].join('');

function DetailRow({ leftLabel, leftValue, rightLabel, rightValue }) {
  return <tr><th>{leftLabel}</th><td>{valueOrDash(leftValue)}</td><th>{rightLabel}</th><td>{valueOrDash(rightValue)}</td></tr>;
}

export function StudentStatementPage({ selfService = false }) {
  const { studentId: paramId } = useParams();
  const navigate = useNavigate();
  const api = useInvoicesApi();
  const lookupApi = useLookupApi();
  const currentUser = useAuthStore((state) => state.user);
  const isStudent = selfService || currentUser?.role === 'student';
  const studentId = isStudent ? 'me' : paramId;
  const [result, setResult] = useState({ id: null, data: null, error: '' });
  const [downloading, setDownloading] = useState(false);
  const loading = Boolean(studentId) && result.id !== studentId;
  const data = result.id === studentId ? result.data : null;
  const error = result.id === studentId ? result.error : '';

  useEffect(() => {
    if (!studentId) return;
    let mounted = true;
    const request = isStudent ? api.myStatement() : api.studentStatement(studentId);
    request
      .then(function (response) { if (mounted) setResult({ id: studentId, data: response.data, error: '' }); })
      .catch(function () { if (mounted) setResult({ id: studentId, data: null, error: 'Failed to load statement.' }); });
    return () => { mounted = false; };
  }, [api, isStudent, studentId]);

  function fetchStudents(query) {
    return lookupApi.search('students', { query, limit: 10 })
      .then(function (response) { return response.data || []; })
      .catch(function () { return []; });
  }

  if (!studentId) return <section className='space-y-6'>
    <div><h1 className='text-[20px] font-semibold text-slate-950'>Student Statement</h1><p className='mt-1 text-[14px] text-slate-500'>Select a student to view their fee statement.</p></div>
    <div className='max-w-md'><LookupSelect label='Student' placeholder='Search by admission number or name' value='' onChange={(id) => navigate('/finance/statement/' + id)} fetchOptions={fetchStudents} /></div>
  </section>;

  if (loading) return <div className='flex items-center justify-center py-20'><div className='h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent' /></div>;
  if (error || !data) return <div className='rounded-2xl border border-red-200 bg-red-50 px-5 py-8 text-center text-red-600'>{error || 'Statement not found.'}</div>;

  const institution = data.institution || { name: data.institution_name };
  const student = data.student;
  const course = data.course;
  const transactions = data.transactions || [];
  const summary = data.summary;

  async function handleDownload() {
    setDownloading(true);
    try {
      const blob = await api.downloadStudentStatement(studentId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'fee-statement-' + student.admission_number + '.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      // silent
    } finally {
      setDownloading(false);
    }
  }

  return <div className='statement-shell mx-auto max-w-[210mm]'>
    <div className='no-print mb-5 flex justify-end gap-3'><button type='button' onClick={handleDownload} disabled={downloading} className='flex items-center gap-2 rounded-lg bg-slate-700 px-5 py-2.5 text-[14px] font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-60'><Download className='h-4 w-4' />{downloading ? 'Downloading...' : 'Download PDF'}</button><button type='button' onClick={() => window.print()} className='flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-[14px] font-medium text-white shadow-sm hover:bg-emerald-700'><Printer className='h-4 w-4' />Print Statement</button></div>
    <article className='statement-print-area bg-white'>
      <p className='statement-generated-at'>{new Date().toLocaleString('en-GB')}</p>
      <header className='statement-header'>
        <img src={logo} alt='Institution logo' />
        <h1>{institution.name || data.institution_name}</h1>
        {institution.postal_address ? <p>{institution.postal_address}</p> : null}
        {institution.telephone ? <p>TEL: {institution.telephone}</p> : null}
        {institution.email ? <p>Email: {institution.email}</p> : null}
        {institution.website ? <p>Web: {institution.website}</p> : null}
        <h2>FEE STATEMENT</h2>
      </header>
      <div className='statement-rule' />
      <table className='statement-details'><tbody>
        <DetailRow leftLabel='STUDENT NAME:' leftValue={student.name} rightLabel='REG NO:' rightValue={student.admission_number} />
        <DetailRow leftLabel='PROGRAM:' leftValue={course?.name} rightLabel='ADMISSION YEAR:' rightValue={student.admission_year} />
        <DetailRow leftLabel='DEPARTMENT:' leftValue={course?.department} rightLabel='YEAR OF STUDY:' rightValue={student.year_of_study} />
        <DetailRow leftLabel='SCHOOL/FACULTY:' leftValue={course?.school || course?.level} rightLabel='TERM:' rightValue={student.term} />
        <DetailRow leftLabel='STUDENT TYPE:' leftValue={student.type} rightLabel='' rightValue='' />
      </tbody></table>
      <table className='statement-ledger'>
        <thead><tr><th className='statement-number'>No.</th><th className='statement-date'>Date</th><th className='statement-reference'>Ref</th><th>Description</th><th className='statement-money'>Debit<br />(KES)</th><th className='statement-money'>Credit<br />(KES)</th><th className='statement-money'>Balance<br />(KES)</th></tr></thead>
        <tbody>
          {transactions.length === 0 ? <tr><td colSpan={7} className='statement-empty'>No fee transactions found.</td></tr> : transactions.map((transaction, index) => {
            const previous = transactions[index - 1];
            const changed = index === 0 || transaction.academic_session_id !== previous?.academic_session_id;
            return <Fragment key={transaction.id}>
              {changed ? <tr className='statement-session-row'><th colSpan={7}>{transaction.session_label || 'OTHER TRANSACTIONS'}</th></tr> : null}
              <tr className='statement-transaction-row'>
                <td>{transaction.number}</td><td>{transaction.date}</td><td>{valueOrDash(transaction.reference)}</td><td>{transaction.description}</td>
                <td className='statement-amount'>{amount(transaction.debit)}</td><td className='statement-amount'>{amount(transaction.credit)}</td><td className='statement-amount'>{amount(transaction.balance)}</td>
              </tr>
            </Fragment>;
          })}
          <tr className='statement-total-row'><th colSpan={4}>TOTAL</th><th>{amount(summary.total_debit)}</th><th>{amount(summary.total_credit)}</th><th>{amount(summary.ledger_balance)}</th></tr>
        </tbody>
      </table>
      <footer className='statement-footer'><span>{institution.name || data.institution_name}</span><span>Fee Statement</span></footer>
      <style>{statementStyles}</style>
    </article>
  </div>;
}
