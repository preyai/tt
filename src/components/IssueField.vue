<script setup lang="ts">
import useMap from "@/hooks/useMap";
import useViewers from "@/hooks/useViewers";
import { useTtStore } from "@/stores/ttStore";
import { useUsersStore } from "@/stores/usersStore";
import escapeHTML from "@/utils/escapeHTML";
import { IonItem, IonLabel, IonText } from "@ionic/vue";
import dayjs from "dayjs";
import { computed, onMounted, ref, shallowRef, watch } from "vue";
import { useI18n } from "vue-i18n";


const { issue, field: _field, target, cf, _value } = defineProps<{
    issue: Issue | DetailIssue,
    field: string,
    target: string,
    cf?: CustomField,
    _value?: any
}>()

const { t } = useI18n()
const tt = useTtStore()
const users = useUsersStore()
const map = useMap()

const text = ref<string | undefined>()
const component = shallowRef<any>()
const field = computed(() => _field[0] === '*' ? _field.slice(1) : _field)
const viewers = useViewers()


const setText = () => {
    try {
        let value = _value || issue[field.value]
        const viewer = tt.meta?.viewers.find(v => v.field === field.value)

        if (!value)
            return

        if (viewer) {
            try {
                const _viewer = viewers.getViewer(viewer.code)
                const result = _viewer(value, issue, field.value, target)
                if (result && typeof result === 'object' && result.template) {
                    component.value = result
                }
                else
                    text.value = result
            } catch (e) {
                text.value = value
                console.warn(viewer.filename, e)
            }
        } else if (cf) {
            const multiple = cf && cf.format && cf.format.indexOf("multiple") >= 0;

            switch (cf.type) {
                case "geo":
                    {
                        const lon = Number(value.split("[")[1].split(",")[0]);
                        const lat = Number(value.split("[")[1].split(",")[1].split("]")[0]);
                        component.value = {
                            data() {
                                return {
                                    escapeHTML,
                                    value: value
                                };
                            },
                            methods: {
                                openMap() {
                                    map.showModal([{ lat, lon }])
                                }
                            },
                            template: `<ion-button @click="openMap">{{escapeHTML(value)}}</ion-button>`
                        }
                    }
                    break;

                case "issues":
                    if (typeof value == "string") {
                        value = [value];
                    }

                    component.value = {
                        data() {
                            return {
                                escapeHTML,
                                value: value
                            };
                        },
                        computed: {
                            items() {
                                return value.map((i: string) => ({
                                    issueId: (i.split("[")[1].split("]")[0]).trim(),
                                    subject: (i.substring(i.indexOf("]") + 1)).trim()
                                }))
                            }
                        },
                        template: `<ion-item v-for="item in items"><router-link  :to="{name:'issue',params:{id:item.issueId}}">{{item.issueId}}: {{item.subject}}</router-link></ion-item>`
                    }
                    break;

                case "array":
                    {
                        if (typeof value == "string") {
                            value = [value];
                        }

                        text.value = '<ion-list>'
                            + value
                                .sort((a: string, b: string) => a.localeCompare(b))
                                .map((i: string) => (`<ion-item>${escapeHTML(i)}</ion-item>`))
                                .join('')
                            + '</ion-list>';
                    }
                    break;

                case "text":
                    // if (cf.format) {
                    //     value = sprintf(cf.format, value);
                    // }

                    switch (cf.editor) {
                        case "yesno":
                        case "noyes":
                            text.value = parseInt(value) ? t("yes") : t("no");
                            break;

                        case "json":
                            text.value = "<pre style='padding: 0px!important; margin: 0px!important;'>" + escapeHTML(JSON.stringify(value, null, 2)) + "</pre>";
                            break;
                        case "datetime-local":
                            text.value = dayjs.unix(value).format('DD.MM.YYYY HH:mm')
                            break;

                        case "date":
                            text.value = dayjs.unix(value).format('DD.MM.YYYY')
                            break;
                    }

                    if (cf.link) {
                        text.value = "<a href='" + cf.link.replaceAll('%value%', value) + "' target='_blank' class='hover'>" + value + "</a>";
                    }

                    break;

                case "select":
                    if (multiple) {
                        text.value = cf.options.map((option) => (`<ion-item><ion-icon name="${value.includes(option.option) ? 'checkbox-outline' : 'square-outline'} "></ion-icon>${option.optionDisplay}</ion-item>`)).join('')
                    } else {
                        text.value = value
                    }
                    break;

                case "users":
                    if (typeof value === 'string')
                        text.value = value
                    else if (Array.isArray(value))
                        text.value = value.map(v => users.users.find(u => u.login === v)?.realName || v).join(', ')
                    else if (value)
                        text.value = Object.values(value).map(v => users.users.find(u => u.login === v)?.realName || v).join(', ')
                    break;

                default:
                    break;
            }

        } else
            switch (field.value) {
                case "workflow":                    
                    text.value = tt.meta?.workflows[value]?.name
                    break;
                case "created":
                case "updated":
                    text.value = dayjs.unix(value).format('DD.MM.YYYY HH:mm')
                    break;
                case "assigned":
                case "watchers":
                    if (typeof value === 'string')
                        text.value = value
                    else if (Array.isArray(value))
                        text.value = value.map(v => users.users.find(u => u.login === v)?.realName || v).join(', ')
                    else if (value)
                        text.value = Object.values(value).map(v => users.users.find(u => u.login === v)?.realName || v).join(', ')
                    break;
                default:
                    text.value = Array.isArray(value) ? value.join(', ') : value
                    break;
            }
    } catch (e) {
        console.warn(e);
    }
}

onMounted(setText)
watch(() => issue, setText)

</script>

<template>
    <IonItem v-if="text || component">
        <IonLabel v-if="target === 'pwa'">
            <h2>
                <IonText color="secondary">
                    <b>{{ cf?.fieldDisplay || $t(field) }}</b>
                </IonText>
            </h2>
            <component v-if="component" :is="component" />
            <div v-else v-html="text"></div>
        </IonLabel>
        <IonLabel v-else>
            <IonText color="secondary">
                <b>{{ cf?.fieldDisplay || $t(field) }}: </b>
            </IonText>
            <component v-if="component" :is="component" />
            <span v-else v-html="text"></span>
        </IonLabel>
    </IonItem>
</template>

<style scoped></style>