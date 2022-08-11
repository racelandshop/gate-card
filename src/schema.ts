export const GateCardEditorSchema = [
    {
        name: "entity",
        selector: { entity: {domain: ["switch"]} }
    },
    {
        name: "sensor",
        selector: { entity: {domain: ["binary_sensor"]} }
    },
    {
        name: "name",
        selector: { text: {} }
    },
//     {
//     //   name: "",
//       type: "grid",
//       // eslint-disable-next-line @typescript-eslint/camelcase
//       column_min_width: "50px",
//       // schema: [
//       //   { name: "show_name", selector: { boolean: {} } },
//       //   { name: "show_state", selector: { boolean: {} } },
//       // ],
//   },
]