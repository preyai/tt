import { onMounted, onUnmounted, Ref } from "vue";
import * as vue from "vue";
import dayjs from "dayjs";
import api from "@/utils/api";
import parseFloatEx from "@/utils/parseFloatEx";
import escapeHTML from "@/utils/escapeHTML";
import nl2br from "@/utils/nl2br";
import convertLinks from "@/utils/convertLinks";
import { useAuthStore } from "@/stores/authStore";
import { useTtStore } from "@/stores/ttStore";
import useMap from "@/hooks/useMap";
import useAlert from "@/hooks/useAlert";
// import {useActions} from "@/hooks/useActions";


// Интерфейс для функции getViewer
interface GetViewer {
    (value: any, issue: DetailIssue, field: string): any;
}

// Интерфейс для хука useViewers
export interface UseViewers {
    getViewer: (code: string) => GetViewer;
}

const useViewers = (): UseViewers => {

    const auth = useAuthStore()
    const tt = useTtStore()
    const alerts = useAlert()
    const modals = useAlert()
    const map = useMap()
    // const actions = useActions()


    const getViewer = (code: string): GetViewer => {
        const utils = {
            vue,
            api,
            auth,
            tt,
            alerts,
            modals,
            map,
            // actions,
            dayjs,
            parseFloatEx,
            escapeHTML,
            nl2br,
            convertLinks
        }
        const f = new Function('value', 'issue', 'field', 'target', 'filter', 'utils', code)

        return (value, issue, field) => f(value, issue, field, 'pwa', null, utils)
    }

    return { getViewer }
}

export default useViewers