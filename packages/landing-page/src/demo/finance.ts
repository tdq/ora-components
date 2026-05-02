import { ButtonBuilder, ButtonStyle } from '@tdq/ora-components';
import { of } from 'rxjs';
import { router } from '../routes';

export function createFinanceDemo(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white';

    container.innerHTML = `
        <div class="absolute inset-0">
            <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
            <div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>
        <div class="relative z-10 container mx-auto px-4 py-20">
            <!-- Back to Landing -->
            <button id="back-to-landing" class="mb-8 flex items-center gap-2 text-white/60 hover:text-white transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                Back to Landing
            </button>

            <div class="grid lg:grid-cols-2 gap-12 items-center min-h-[70vh]">
                <div class="space-y-8">
                    <div class="space-y-6">
                        <div class="inline-block">
                            <span class="px-4 py-2 rounded-full text-sm font-medium bg-white/10 backdrop-blur-md border border-white/20 text-white">🚀 Next-Gen Financial Platform</span>
                        </div>
                        <h1 class="text-5xl md:text-7xl font-bold leading-tight">
                            <span class="bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">Future of</span><br />
                            <span class="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Finance</span>
                        </h1>
                        <p class="text-xl text-gray-300 max-w-lg leading-relaxed">
                            Experience seamless digital banking with AI-powered insights, instant transactions, and enterprise-grade security.
                        </p>
                    </div>
                    <div class="flex flex-col sm:flex-row gap-4" id="cta-container">
                        <!-- Buttons will be injected here -->
                    </div>
                </div>
                
                <div class="relative transform rotate-2">
                    <div class="grid grid-cols-2 gap-6">
                        <div class="col-span-2 group cursor-pointer">
                            <div class="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 transform transition-all duration-500 hover:scale-105 hover:rotate-1 hover:shadow-2xl hover:shadow-purple-500/25">
                                <div class="flex items-center justify-between mb-4">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-8 w-8 text-green-400"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>
                                    <span class="text-sm text-gray-400">Live Stats</span>
                                </div>
                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <div class="text-gray-400 text-sm">Total Volume</div>
                                        <span class="font-bold text-2xl md:text-3xl text-white">€2,400,000</span>
                                    </div>
                                    <div>
                                        <div class="text-gray-400 text-sm">Active Users</div>
                                        <span class="font-bold text-2xl md:text-3xl text-white">150,000+</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <!-- ... other cards ... -->
                    </div>
                </div>
            </div>
        </div>
    `;

    container.querySelector('#back-to-landing')?.addEventListener('click', () => router.navigate('/'));

    const ctaContainer = container.querySelector('#cta-container')!;
    
    const getStartedBtn = new ButtonBuilder()
        .withCaption(of('Get Started'))
        .withStyle(of(ButtonStyle.FILLED))
        .build();
    getStartedBtn.className = 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 px-8 py-6 text-lg font-semibold rounded-md';
    
    const watchDemoBtn = new ButtonBuilder()
        .withCaption(of('Watch Demo'))
        .withStyle(of(ButtonStyle.OUTLINED))
        .asGlass()
        .build();
    watchDemoBtn.className = 'border-white/20 bg-white/10 backdrop-blur-md text-white hover:bg-white/20 px-8 py-6 text-lg rounded-md';

    ctaContainer.appendChild(getStartedBtn);
    ctaContainer.appendChild(watchDemoBtn);

    return container;
}
