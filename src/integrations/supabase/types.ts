export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      alertas: {
        Row: {
          created_at: string
          descricao: string
          endereco_aproximado: string | null
          escola_id: string
          id: string
          latitude: number | null
          longitude: number | null
          orgaos_destino: Database["public"]["Enums"]["orgao_tipo"][]
          precisao_metros: number | null
          prioridade: Database["public"]["Enums"]["prioridade_alerta"]
          status: Database["public"]["Enums"]["status_alerta"]
          tipo: Database["public"]["Enums"]["tipo_ocorrencia"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao: string
          endereco_aproximado?: string | null
          escola_id: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          orgaos_destino?: Database["public"]["Enums"]["orgao_tipo"][]
          precisao_metros?: number | null
          prioridade?: Database["public"]["Enums"]["prioridade_alerta"]
          status?: Database["public"]["Enums"]["status_alerta"]
          tipo: Database["public"]["Enums"]["tipo_ocorrencia"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string
          endereco_aproximado?: string | null
          escola_id?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          orgaos_destino?: Database["public"]["Enums"]["orgao_tipo"][]
          precisao_metros?: number | null
          prioridade?: Database["public"]["Enums"]["prioridade_alerta"]
          status?: Database["public"]["Enums"]["status_alerta"]
          tipo?: Database["public"]["Enums"]["tipo_ocorrencia"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alertas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
        ]
      }
      atendimentos: {
        Row: {
          acao: Database["public"]["Enums"]["acao_atendimento"]
          alerta_id: string
          autoridade_id: string
          created_at: string
          id: string
          observacao: string | null
        }
        Insert: {
          acao: Database["public"]["Enums"]["acao_atendimento"]
          alerta_id: string
          autoridade_id: string
          created_at?: string
          id?: string
          observacao?: string | null
        }
        Update: {
          acao?: Database["public"]["Enums"]["acao_atendimento"]
          alerta_id?: string
          autoridade_id?: string
          created_at?: string
          id?: string
          observacao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "atendimentos_alerta_id_fkey"
            columns: ["alerta_id"]
            isOneToOne: false
            referencedRelation: "alertas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atendimentos_autoridade_id_fkey"
            columns: ["autoridade_id"]
            isOneToOne: false
            referencedRelation: "autoridades"
            referencedColumns: ["id"]
          },
        ]
      }
      autoridades: {
        Row: {
          cidade: string | null
          created_at: string
          estado: string | null
          id: string
          matricula: string | null
          nome_agente: string
          orgao: Database["public"]["Enums"]["orgao_tipo"]
          telefone: string | null
          unidade: string | null
          updated_at: string
        }
        Insert: {
          cidade?: string | null
          created_at?: string
          estado?: string | null
          id: string
          matricula?: string | null
          nome_agente: string
          orgao: Database["public"]["Enums"]["orgao_tipo"]
          telefone?: string | null
          unidade?: string | null
          updated_at?: string
        }
        Update: {
          cidade?: string | null
          created_at?: string
          estado?: string | null
          id?: string
          matricula?: string | null
          nome_agente?: string
          orgao?: Database["public"]["Enums"]["orgao_tipo"]
          telefone?: string | null
          unidade?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      dispositivos_push: {
        Row: {
          created_at: string
          id: string
          plataforma: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          plataforma?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          plataforma?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      escolas: {
        Row: {
          cidade: string | null
          cnpj: string | null
          created_at: string
          endereco: string | null
          estado: string | null
          id: string
          nome: string
          responsavel: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          endereco?: string | null
          estado?: string | null
          id: string
          nome: string
          responsavel?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          endereco?: string | null
          estado?: string | null
          id?: string
          nome?: string
          responsavel?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      acao_atendimento:
        | "recebimento_confirmado"
        | "equipe_em_deslocamento"
        | "chegada_ao_local"
        | "ocorrencia_finalizada"
      app_role: "escola" | "autoridade"
      orgao_tipo: "policia" | "samu" | "bombeiros" | "conselho_tutelar"
      prioridade_alerta: "baixa" | "media" | "alta" | "vermelho"
      status_alerta:
        | "aguardando_resposta"
        | "recebimento_confirmado"
        | "equipe_acionada"
        | "atendimento_iniciado"
        | "encerrado"
      tipo_ocorrencia:
        | "ameaca_seguranca"
        | "invasao"
        | "emergencia_medica"
        | "incendio"
        | "outro"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      acao_atendimento: [
        "recebimento_confirmado",
        "equipe_em_deslocamento",
        "chegada_ao_local",
        "ocorrencia_finalizada",
      ],
      app_role: ["escola", "autoridade"],
      orgao_tipo: ["policia", "samu", "bombeiros", "conselho_tutelar"],
      prioridade_alerta: ["baixa", "media", "alta", "vermelho"],
      status_alerta: [
        "aguardando_resposta",
        "recebimento_confirmado",
        "equipe_acionada",
        "atendimento_iniciado",
        "encerrado",
      ],
      tipo_ocorrencia: [
        "ameaca_seguranca",
        "invasao",
        "emergencia_medica",
        "incendio",
        "outro",
      ],
    },
  },
} as const
