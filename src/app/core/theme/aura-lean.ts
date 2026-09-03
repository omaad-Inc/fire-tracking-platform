/**
 * Aura, trimmed to the components this app renders (Web Premium P3-2).
 *
 * `import Aura from '@primeng/themes/aura'` ships the theme tokens of every
 * PrimeNG component (75 of them, ~92 kB of the 121 kB `main` chunk) even
 * though the app imports 25 modules. Presets are plain objects, so the
 * tree-shaker cannot drop the unused entries; composing the preset by hand
 * from Aura's own per-component modules can. Each entry here is the exact
 * object Aura's index uses, so nothing renders differently: a component that
 * is listed is styled byte-for-byte as before, a component that is not
 * listed is one the app does not render.
 *
 * Two kinds of entry:
 *  - DIRECT: a `primeng/<module>` the app imports somewhere (buttons, selects,
 *    dialogs, the transactions table, ...);
 *  - INDIRECT: a component PrimeNG renders inside one of the direct ones
 *    (fileupload draws p-message and p-progressbar, multiselect draws p-chip
 *    and an icon field, the table draws its paginator). Missing one shows up
 *    as an unstyled inner element, not as an error, hence the runtime probe
 *    in e2e/theme-tokens.smoke.spec.ts on top of the static guard.
 *
 * Adding a PrimeNG component to the app: import its module where you need it
 * AND add its theme here; `npm run theme:guard` (chained into `npm run build`)
 * fails the build until both are in place. Modules without a theme (api,
 * config, chart, styleclass) are listed in the guard, not here.
 */
import base from '@primeng/themes/aura/base';

// Direct
import avatar from '@primeng/themes/aura/avatar';
import button from '@primeng/themes/aura/button';
import checkbox from '@primeng/themes/aura/checkbox';
import datatable from '@primeng/themes/aura/datatable';
import datepicker from '@primeng/themes/aura/datepicker';
import dialog from '@primeng/themes/aura/dialog';
import divider from '@primeng/themes/aura/divider';
import fileupload from '@primeng/themes/aura/fileupload';
import inputnumber from '@primeng/themes/aura/inputnumber';
import inputotp from '@primeng/themes/aura/inputotp';
import inputtext from '@primeng/themes/aura/inputtext';
import multiselect from '@primeng/themes/aura/multiselect';
import password from '@primeng/themes/aura/password';
import progressspinner from '@primeng/themes/aura/progressspinner';
import ripple from '@primeng/themes/aura/ripple';
import select from '@primeng/themes/aura/select';
import tag from '@primeng/themes/aura/tag';
import textarea from '@primeng/themes/aura/textarea';
import toast from '@primeng/themes/aura/toast';
import toggleswitch from '@primeng/themes/aura/toggleswitch';
import tooltip from '@primeng/themes/aura/tooltip';

// Indirect (rendered inside a direct one)
import chip from '@primeng/themes/aura/chip';           // multiselect chips
import iconfield from '@primeng/themes/aura/iconfield'; // select / multiselect filter field
import message from '@primeng/themes/aura/message';     // fileupload errors
import paginator from '@primeng/themes/aura/paginator'; // datatable
import progressbar from '@primeng/themes/aura/progressbar'; // fileupload

/** Same shape as Aura's default export: `{ ...base, components: {...} }`. */
export const AuraLean = {
    ...base,
    components: {
        avatar,
        button,
        checkbox,
        chip,
        datatable,
        datepicker,
        dialog,
        divider,
        fileupload,
        iconfield,
        inputnumber,
        inputotp,
        inputtext,
        message,
        multiselect,
        paginator,
        password,
        progressbar,
        progressspinner,
        ripple,
        select,
        tag,
        textarea,
        toast,
        toggleswitch,
        tooltip,
    },
};
