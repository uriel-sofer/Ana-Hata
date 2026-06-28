import type { Appointment, Client, Service } from "@/types";

type Props = {
  appointment: Appointment & { client?: Pick<Client, "full_name">; service?: Pick<Service, "name"> };
  masked?: boolean;
};

export function AppointmentCard({ appointment, masked = false }: Props) {
  const start = new Date(appointment.start_time);
  const end = new Date(appointment.end_time);

  return (
    <div className="bg-blue-100 border border-blue-300 rounded p-2 text-xs">
      <p className="font-medium">
        {start.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
        {" – "}
        {end.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
      </p>
      {!masked && appointment.client && (
        <p className="text-slate-700">{appointment.client.full_name}</p>
      )}
      {masked && <p className="text-slate-400 italic">תפוס</p>}
      {appointment.service && <p className="text-slate-500">{appointment.service.name}</p>}
    </div>
  );
}
