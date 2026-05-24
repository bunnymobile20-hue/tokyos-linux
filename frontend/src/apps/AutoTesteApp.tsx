export default function AutoTesteApp() {
  return (
    <div className="flex-1 bg-slate-100 flex flex-col h-full relative">
      <iframe 
        src={`http://${window.location.hostname}:8502`}
        className="w-full h-full border-none absolute inset-0"
        title="AutoTeste Tokyo IA"
        style={{ height: '100vh' }}
      />
    </div>
  )
}
