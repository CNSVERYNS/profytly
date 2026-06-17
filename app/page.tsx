export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-7xl mx-auto px-6 py-20">

        <div className="inline-flex items-center rounded-full border border-zinc-800 px-4 py-2 text-sm text-zinc-400">
          🚗 Auction Intelligence Platform
        </div>

        <h1 className="mt-8 text-6xl font-bold max-w-4xl">
          Know Your Max Bid
          <span className="text-green-500"> Before You Buy</span>
        </h1>

        <p className="mt-6 text-xl text-zinc-400 max-w-3xl">
          Paste any Copart or IAAI vehicle link and get market value,
          dealer value, auction fees, risk analysis and profit estimates
          in seconds.
        </p>

        <div className="mt-10 flex gap-4">
          <button className="bg-green-500 hover:bg-green-600 px-6 py-3 rounded-lg font-semibold text-black">
            Join Beta
          </button>

          <button className="border border-zinc-700 px-6 py-3 rounded-lg">
            Watch Demo
          </button>
        </div>

        <div className="mt-20 rounded-2xl border border-zinc-800 bg-zinc-900 p-8">

          <div className="text-zinc-400 mb-4">
            Example Analysis
          </div>

          <div className="grid md:grid-cols-2 gap-6">

            <div>
              <h3 className="font-bold text-xl">
                2016 Kia Sorento LX
              </h3>

              <p className="text-zinc-400 mt-2">
                146,493 Miles • Clean Title • Run & Drive
              </p>
            </div>

            <div className="space-y-2">
              <div>Market Value: $8,900</div>
              <div>Dealer Value: $9,700</div>
              <div>Auction Fees: $875</div>
              <div>Transport: $300</div>
              <div className="text-green-500 font-bold">
                Recommended Bid: $6,200
              </div>
            </div>

          </div>

        </div>

      </div>
    </main>
  );
}