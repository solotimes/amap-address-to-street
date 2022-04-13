// import Index from '@/pages/index.vue';
import Decoder from '@/pages/decoder.vue';
import NotFound from '@/pages/not-found.vue';

export const routes = [
  { path: '/', component: Decoder },
  { path: '/:path(.*)', component: NotFound },
];

export default routes;
